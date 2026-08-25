import { useState, useRef, useEffect } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import XrayPrefillBanner from "./components/XrayPrefillBanner";
import { getXrayPrefill, clearXrayPrefill } from "./lib/xrayPrefill";
import { detectCitySlug, getCapRateBenchmark, getDscrThresholds } from "./lib/benchmarks";
import OnboardingTour from "./components/OnboardingTour";
import LossToLeasePanel from "./components/LossToLeasePanel";

const num = v => parseFloat(v) || 0;
const fmt = (n, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);
const fmtRent = n => n ? `${fmt(n)}/mo` : "—";

function median(arr) {
  const a = arr.filter(Boolean);
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function daysAgo(n) {
  if (n == null) return "—";
  if (n === 0)   return "Today";
  if (n < 30)    return `${n}d ago`;
  if (n < 365)   return `${Math.round(n / 30)}mo ago`;
  return `${(n / 365).toFixed(1)}yr ago`;
}

function shortAddr(addr = "") {
  // Strip state+zip from the end for display brevity
  return addr.replace(/,\s*[A-Z]{2}\s*\d{5}(-\d{4})?$/, "").trim();
}

// Detect Canadian addresses by province code or postal code
const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
function isCanadianAddress(addr) {
  if (!addr) return false;
  // Canadian postal code: A1A 1A1
  if (/[A-Z]\d[A-Z]\s*\d[A-Z]\d/i.test(addr)) return true;
  // Explicit "Canada"
  if (/\bcanada\b/i.test(addr)) return true;
  // Province code after a comma: ", ON" / ", BC" etc.
  return CA_PROVINCES.some(p => new RegExp(`,\\s*${p}\\b`, 'i').test(addr));
}

function fmtCad(n) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

function ListingSiteLinks({ address }) {
  const enc = encodeURIComponent(address);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
      <a href={`https://www.zillow.com/homes/${enc}_rb/`} target="_blank" rel="noopener noreferrer"
        style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:700,textDecoration:"none",background:"rgba(0,106,255,0.15)",color:"#5aadff",whiteSpace:"nowrap" }}>
        Zillow
      </a>
      <a href={`https://www.redfin.com/search#location=${enc}`} target="_blank" rel="noopener noreferrer"
        style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:700,textDecoration:"none",background:"rgba(220,50,50,0.15)",color:"#ff7c7c",whiteSpace:"nowrap" }}>
        Redfin
      </a>
      <a href={`https://www.google.com/maps/search/${enc}`} target="_blank" rel="noopener noreferrer"
        style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:700,textDecoration:"none",background:"rgba(52,217,138,0.1)",color:"var(--green)",whiteSpace:"nowrap" }}>
        Maps
      </a>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght;500;600;700;800&family=Geist+Mono:wght;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}
  .ph-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .ph-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .ph-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.ph-logo span{color:var(--blue)}
  .ph-nav-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ph-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px}.ph-nav-link:hover{color:var(--text)}.ph-nav-link.active{color:var(--blue)}
  .ph-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}.ph-nav-ghost:hover{color:var(--text)}

  /* Hero */
  .ph-hero{padding:56px 24px 48px;text-align:center;position:relative;overflow:hidden}
  .ph-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.025) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .ph-glow{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(59,158,255,0.09) 0%,transparent 65%);pointer-events:none}
  .ph-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:3px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--blue);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .ph-hero h1{font-size:clamp(28px,5vw,52px);font-weight:800;letter-spacing:-2px;color:var(--text);line-height:1.05;margin-bottom:12px;position:relative;z-index:1}
  .ph-hero h1 span{color:var(--blue)}
  .ph-hero p{font-size:16px;color:var(--sub);max-width:500px;margin:0 auto 36px;line-height:1.6;position:relative;z-index:1}

  /* Search bar */
  .ph-search-wrap{max-width:680px;margin:0 auto;position:relative;z-index:2}
  .ph-search-box{display:flex;align-items:center;background:var(--card);border:1.5px solid rgba(59,158,255,0.3);border-radius:6px;padding:6px 6px 6px 20px;gap:10px;box-shadow:0 0 40px rgba(59,158,255,0.08);transition:border-color 0.2s,box-shadow 0.15s}
  .ph-search-box:focus-within{border-color:rgba(59,158,255,0.6);box-shadow:0 0 60px rgba(59,158,255,0.15)}
  .ph-search-icon{font-size:20px;flex-shrink:0}
  .ph-search-input{flex:1;background:transparent;border:none;outline:none;font-size:16px;color:var(--text);font-family:'Geist',sans-serif;padding:10px 0}
  .ph-search-input::placeholder{color:var(--dim)}
  .ph-search-btn{background:var(--blue);color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Geist',sans-serif;white-space:nowrap;transition:all 0.15s;flex-shrink:0}
  .ph-search-btn:hover{background:#5aadff;transform:translateY(-1px)}
  .ph-search-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
  .ph-search-hint{font-size:12px;color:var(--dim);margin-top:10px}

  /* Results area */
  .ph-results{max-width:1060px;margin:0 auto;padding:0 20px 100px}

  /* Property header */
  .ph-prop-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
  .ph-prop-address{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .ph-prop-sub{font-size:13px;color:var(--sub);margin-top:3px}
  .ph-prop-type{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);border-radius:3px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--blue);letter-spacing:0.5px;text-transform:uppercase}

  /* Map */
  .ph-map{border-radius:6px;overflow:hidden;border:1px solid var(--borderf);margin-bottom:20px;position:relative}
  .ph-map iframe{display:block;width:100%;height:300px;border:none}
  .ph-map-btns{display:flex;gap:8px;padding:12px 14px;background:var(--card2);border-top:1px solid var(--borderf);flex-wrap:wrap}
  .ph-map-btn{display:inline-flex;align-items:center;gap:6px;border-radius: 6px;padding:7px 14px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer;border:none;font-family:'Geist',sans-serif;transition:opacity 0.15s}
  .ph-map-btn:hover{opacity:0.85}

  /* Property data grid */
  .ph-data-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-bottom:20px}
  .ph-data-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:14px 16px}
  .ph-data-label{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
  .ph-data-val{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
  .ph-data-val.green{color:var(--green)}.ph-data-val.blue{color:var(--blue)}
  .ph-data-sub{font-size:10.5px;color:var(--dim);margin-top:3px}

  /* Rent estimate bar */
  .ph-rent-bar{background:linear-gradient(135deg,rgba(52,217,138,0.08),rgba(59,158,255,0.05));border:1px solid rgba(52,217,138,0.2);border-radius:6px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .ph-rent-icon{font-size:28px;flex-shrink:0}
  .ph-rent-main{flex:1}
  .ph-rent-label{font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
  .ph-rent-val{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .ph-rent-sub{font-size:12px;color:var(--sub);margin-top:2px}

  /* Market snapshot */
  .ph-market-snap{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  @media(max-width:680px){.ph-market-snap{grid-template-columns:repeat(2,1fr)}}
  .ph-snap-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:14px 16px;text-align:center}
  .ph-snap-label{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
  .ph-snap-val{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .ph-snap-sub{font-size:10.5px;color:var(--dim);margin-top:3px}

  /* Comps sections */
  .ph-comps-section{margin-bottom:28px}
  .ph-comps-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px}
  .ph-comps-title{font-size:14px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
  .ph-comps-badge{font-size:10px;font-weight:700;color:var(--sub);background:rgba(15,23,42,0.05);border:1px solid var(--borderf);border-radius:3px;padding:2px 9px}
  .ph-comps-wrap{overflow-x:auto;border-radius:6px;border:1px solid var(--borderf)}
  .ph-comps-table{width:100%;border-collapse:collapse;background:var(--card);min-width:600px}
  .ph-comps-table th{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;padding:10px 14px;text-align:left;border-bottom:1px solid var(--borderf);background:var(--card2);white-space:nowrap}
  .ph-comps-table td{padding:10px 14px;font-size:12.5px;color:var(--text);border-bottom:1px solid rgba(15,23,42,0.03);vertical-align:middle}
  .ph-comps-table tr:last-child td{border-bottom:none}
  .ph-comps-table tr:hover td{background:rgba(255,255,255,0.02)}
  .ph-comp-addr{font-size:12px;color:var(--text);font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ph-comp-corr{display:inline-block;width:32px;height:6px;border-radius:3px;background:var(--borderf);overflow:hidden;vertical-align:middle;margin-left:4px}
  .ph-comp-corr-fill{height:100%;border-radius:3px;background:var(--green)}

  /* ARV/Rent suggestion */
  .ph-suggest{border-radius:6px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .ph-suggest.arv{background:linear-gradient(135deg,rgba(59,158,255,0.07),rgba(59,158,255,0.03));border:1px solid rgba(59,158,255,0.25)}
  .ph-suggest.rent{background:linear-gradient(135deg,rgba(52,217,138,0.07),rgba(52,217,138,0.03));border:1px solid rgba(52,217,138,0.25)}
  .ph-suggest-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .ph-suggest.arv .ph-suggest-label{color:var(--blue)}
  .ph-suggest.rent .ph-suggest-label{color:var(--green)}
  .ph-suggest-val{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .ph-suggest-range{font-size:12px;color:var(--sub);margin-top:2px}
  .ph-suggest-btns{display:flex;gap:8px;flex-wrap:wrap}
  .ph-suggest-btn{border:none;border-radius: 10px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Geist',sans-serif;transition:all 0.15s}
  .ph-suggest-btn:hover{transform:translateY(-1px)}
  .ph-suggest-btn.flip{background:rgba(59,158,255,0.15);color:var(--blue)}
  .ph-suggest-btn.brrrr{background:rgba(167,130,255,0.15);color:var(--purple)}
  .ph-suggest-btn.mf{background:rgba(52,217,138,0.15);color:var(--green)}

  /* Comps loading */
  .ph-comps-loading{display:flex;align-items:center;gap:10px;padding:16px 20px;background:var(--card);border:1px solid var(--borderf);border-radius:6px;margin-bottom:20px;color:var(--sub);font-size:13px}
  .ph-mini-spin{width:16px;height:16px;border:2px solid var(--borderf);border-top-color:var(--blue);border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Strategy section */
  .ph-strategy-title{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;margin-top:8px}
  .ph-strategies{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:32px}
  @media(max-width:680px){.ph-strategies{grid-template-columns:1fr}}
  .ph-strat{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:22px 20px;cursor:pointer;transition:all 0.15s;text-align:left;font-family:'Geist',sans-serif;display:flex;flex-direction:column;gap:8px}
  .ph-strat:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,0.4)}
  .ph-strat.flip{border-color:rgba(59,158,255,0.25)}.ph-strat.flip:hover{border-color:rgba(59,158,255,0.5);background:rgba(59,158,255,0.04)}
  .ph-strat.brrrr{border-color:rgba(167,130,255,0.25)}.ph-strat.brrrr:hover{border-color:rgba(167,130,255,0.5);background:rgba(167,130,255,0.04)}
  .ph-strat.mf{border-color:rgba(52,217,138,0.25)}.ph-strat.mf:hover{border-color:rgba(52,217,138,0.5);background:rgba(52,217,138,0.04)}
  .ph-strat-icon{font-size:32px;line-height:1}
  .ph-strat-name{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
  .ph-strat-desc{font-size:12.5px;color:var(--sub);line-height:1.55}
  .ph-strat-cta{font-size:12px;font-weight:700;margin-top:4px;display:flex;align-items:center;gap:4px}
  .ph-strat.flip .ph-strat-cta{color:var(--blue)}
  .ph-strat.brrrr .ph-strat-cta{color:var(--purple)}
  .ph-strat.mf .ph-strat-cta{color:var(--green)}
  .ph-strat-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
  .ph-strat-pill{font-size:10px;font-weight:600;padding:3px 9px;border-radius:3px;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);color:var(--dim)}

  .ph-blank-strategies{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1060px;margin:0 auto;padding:0 20px 80px}
  @media(max-width:680px){.ph-blank-strategies{grid-template-columns:1fr}}

  .ph-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius:6px;padding:14px 18px;font-size:13px;color:var(--red);margin-bottom:16px}
  .ph-loading{text-align:center;padding:60px 24px;color:var(--sub)}
  .ph-spinner{width:40px;height:40px;border:3px solid var(--borderf);border-top-color:var(--blue);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px}

  .ph-section-divider{height:1px;background:var(--borderf);margin:8px 0 24px}

  @media(max-width:640px){
    .ph-hero{padding:40px 16px 36px}
    .ph-results{padding:0 14px 80px}
    .ph-map iframe{height:220px}
  }
`;

const STRATEGIES = [
  {
    id: "flip", cls: "flip", icon: "🏚️", name: "Fix & Flip",
    desc: "Buy, renovate, and sell for profit. See your ARV, repair budget, profit margin, and deal grade.",
    cta: "Analyze as a flip →",
    pills: ["ARV", "Profit Margin", "MAO", "Deal Grade", "ROI"],
    route: "/app",
  },
  {
    id: "brrrr", cls: "brrrr", icon: "🔄", name: "BRRRR Strategy",
    desc: "Buy, rehab, rent, refinance, repeat. See if you can pull all your cash out and still cash flow.",
    cta: "Model the BRRRR →",
    pills: ["Cash Recycled", "DSCR", "Cash-on-Cash", "Post-Refi CF"],
    route: "/brrrr",
  },
  {
    id: "mf", cls: "mf", icon: "🏢", name: "Multifamily / Rental",
    desc: "Underwrite an income property with full NOI, cap rate, DSCR, 5-year projection and sensitivity analysis.",
    cta: "Underwrite this deal →",
    pills: ["NOI", "Cap Rate", "DSCR", "CoC", "5-Yr Projection"],
    route: "/commercial",
  },
];

export default function PropertyHub() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [query,        setQuery]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [property,     setProperty]     = useState(null);
  const [saleComps,    setSaleComps]    = useState(null);
  const [rentComps,    setRentComps]    = useState(null);
  const [caComps,      setCaComps]      = useState(null);   // Realtor.ca Canadian data
  const [cityData,     setCityData]     = useState(null);   // Municipal open data — zoning, permits, year built
  const [compsLoading, setCompsLoading] = useState(false);
  const inputRef = useRef(null);

  // X-Ray prefill: when the user runs an X-Ray on the Landing then arrives
  // here, pre-fill the query and surface a "from your X-Ray" banner.
  const [xrayPrefill, setXrayPrefill] = useState(null);
  useEffect(() => {
    const xp = getXrayPrefill();
    if (!xp) return;
    setXrayPrefill(xp);
    setQuery(prev => prev || xp.address);
  }, []);

  // Deep-link support: /property?addr=<address> pre-fills the query field
  // and auto-triggers the lookup. Used by the "▶ Try Live Demo" button on
  // the landing page — one-click walkthrough for VCs and first-time visitors
  // without needing to type an address in. Also accepts ?address= for
  // backward compatibility with existing X-Ray flow URLs.
  //
  // Race-condition note: URL param takes precedence over stale localStorage
  // prefill. Fires exactly once per mount — subsequent user edits behave normally.
  const [autofired, setAutofired] = useState(false);
  useEffect(() => {
    if (autofired) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const addr = params.get("addr") || params.get("address");
      if (!addr) return;
      setQuery(addr); // URL param always wins over stale state
      setAutofired(true);
      // Give React a tick to commit the query state, then fire search
      // directly so we don't rely on effect chaining. search() reads from
      // the query state, so a small delay is sufficient.
      const t = setTimeout(() => {
        try { search(); } catch (e) { console.warn("demo autofire failed", e); }
      }, 100);
      return () => clearTimeout(t);
    } catch (e) {
      console.warn("deep-link parse failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autofired]);

  // ── Building Grade — 4-dimension institutional read ──────────────────────
  // Auto-fires when property + zoning land. Cached in component state for
  // the session; re-fetches when address changes.
  const [buildingGrade, setBuildingGrade] = useState(null);
  const [buildingGradeLoading, setBuildingGradeLoading] = useState(false);

  useEffect(() => {
    if (!property?.address) return;
    if (!property?.estimatedValue && !property?.assessedValue) return;

    let cancelled = false;
    setBuildingGradeLoading(true);
    setBuildingGrade(null);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "building-grade",
            address: property.address,
            zoning: property.zoning || null,
            assessment: {
              yearBuilt:     property.yearBuilt,
              assessedValue: property.assessedValue || property.estimatedValue,
              lotSizeSqM:    property.lotSize ? property.lotSize / 10.7639 : null,
            },
            cmhc: property.cmhc || null,
          }),
        });
        const j = await r.json();
        if (!cancelled && j?.overall) setBuildingGrade(j);
      } catch {
        // Silent fail — panel just doesn't render.
      } finally {
        if (!cancelled) setBuildingGradeLoading(false);
      }
    }, 1000); // small debounce so the search results render first

    return () => { cancelled = true; clearTimeout(t); };
  }, [property?.address, property?.estimatedValue, property?.assessedValue]);

  // ── Loss-to-Lease — drop a rent roll PDF, get stranded upside ────────────
  const [ltlData, setLtlData]       = useState(null);
  const [ltlLoading, setLtlLoading] = useState(false);
  const [ltlError, setLtlError]     = useState("");

  async function runLossToLease(file) {
    if (!file) return;
    setLtlError("");
    setLtlLoading(true);
    try {
      const b64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload  = () => resolve(String(fr.result).split(",")[1] || "");
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });
      // Detect city from the loaded property (cleaner than guessing from
      // the search query). Falls back to the current query if needed.
      const addr = (property?.address || query || "").toLowerCase();
      let city = "calgary", province = "alberta";
      const m = [
        ["edmonton","alberta"],["calgary","alberta"],["red deer","alberta"],["lethbridge","alberta"],
        ["vancouver","bc"],["victoria","bc"],["kelowna","bc"],["abbotsford","bc"],
        ["toronto","ontario"],["ottawa","ontario"],["hamilton","ontario"],["london","ontario"],
        ["kitchener","ontario"],["windsor","ontario"],["kingston","ontario"],["barrie","ontario"],
        ["montreal","quebec"],["quebec city","quebec"],["winnipeg","manitoba"],
        ["saskatoon","saskatchewan"],["regina","saskatchewan"],["halifax","nova scotia"],
        ["moncton","new brunswick"],["saint john","new brunswick"],
        ["st. john's","newfoundland and labrador"],["charlottetown","prince edward island"],
      ];
      for (const [c,p] of m) {
        if (addr.includes(c)) { city = c; province = p; break; }
      }
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "rent-roll-loss-to-lease",
          document: b64,
          mediaType: file.type || "application/pdf",
          city, province,
        }),
      });
      const data = await r.json();
      setLtlData(data);
      if (!data.ok && data.error) setLtlError(data.error);
    } catch (e) {
      setLtlError(e?.message || "Could not analyze the rent roll.");
    } finally {
      setLtlLoading(false);
    }
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setProperty(null);
    setSaleComps(null);
    setRentComps(null);
    setCaComps(null);
    setCityData(null);

    const isCA = isCanadianAddress(q);

    try {
      if (isCA) {
        // ── Canadian address: fire property-lookup + realtor-ca + CMHC in parallel ──
        // Extract city name for CMHC lookup
        const cityMatch = q.match(/,\s*([^,]+?)\s*(?:,|BC|AB|ON|QC|MB|SK|NS|NB|PE|NL|NT|NU|YT)/i);
        const cityForCMHC = cityMatch ? cityMatch[1].trim() : q.split(",")[1]?.trim() || "";
        const provMatch = q.match(/\b(BC|AB|ON|QC|MB|SK|NS|NB|PE|NL)\b/i);
        const provForCMHC = provMatch ? provMatch[1].toUpperCase() : "";

        const [propRes, caRes, cmhcRes, cityRes] = await Promise.all([
          fetch(`/api/property-lookup?address=${encodeURIComponent(q)}`),
          fetch(`/api/realtor-ca?address=${encodeURIComponent(q)}`),
          cityForCMHC ? fetch(`/api/cmhc-rental?city=${encodeURIComponent(cityForCMHC)}&province=${provForCMHC}`) : Promise.resolve(null),
          fetch(`/api/city-data?address=${encodeURIComponent(q)}`).catch(() => null),
        ]);

        // Municipal open data — zoning, permits, year-built. Soft-fail: a
        // 404 here just means the city isn't supported yet, not an error.
        if (cityRes?.ok) {
          try { setCityData(await cityRes.json()); } catch {}
        }

        if (propRes.ok) {
          const propJson = await propRes.json();
          setProperty({ ...propJson, searchQuery: q, isCanadian: true });
        } else {
          // Rentcast doesn't cover Canada — that's OK, show map + Realtor.ca comps
          setProperty({ searchQuery: q, notFound: true, isCanadian: true });
        }

        if (caRes.ok) {
          const caJson = await caRes.json();
          // Inject CMHC rent estimate if Realtor.ca has no rent data
          if (cmhcRes?.ok) {
            try {
              const cmhc = await cmhcRes.json();
              caJson.cmhcData = cmhc;
            } catch {}
          }
          setCaComps(caJson);
        } else {
          const errJson = await caRes.json().catch(() => ({}));
          setError(errJson.error || "Realtor.ca lookup failed — try a full address with city and province.");
        }

      } else {
        // ── US address: existing Rentcast flow ─────────────────────────────
        const res  = await fetch(`/api/property-lookup?address=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Lookup failed");
        setProperty({ ...json, searchQuery: q });

        // Fire comps in parallel after property found.
        // Critical: spinner state must reset whether the fetches succeed,
        // fail, throw, or return non-OK status. Previously stayed stuck
        // forever if either comp endpoint 500'd. allSettled + finally make
        // the spinner reliably go away.
        setCompsLoading(true);
        try {
          const enc = encodeURIComponent(json.address || q);
          const [scRes, rcRes] = await Promise.allSettled([
            fetch(`/api/comps?type=sale&address=${enc}`),
            fetch(`/api/comps?type=rental&address=${enc}`),
          ]);
          if (scRes.status === "fulfilled" && scRes.value.ok) {
            try { setSaleComps(await scRes.value.json()); } catch {}
          }
          if (rcRes.status === "fulfilled" && rcRes.value.ok) {
            try { setRentComps(await rcRes.value.json()); } catch {}
          }
        } finally {
          setCompsLoading(false);
        }
      }

    } catch(e) {
      setProperty({ searchQuery: q, notFound: true });
      // Distinguish geocode failures (user can fix by adding city/province)
      // from API/config failures (needs Vercel intervention). Also handle
      // network errors distinctly so a 30s TCP timeout doesn't look like
      // "your API key is bad."
      const msg = e.message || "";
      let friendly;
      if (/could not geocode|no geocode result|geocode failed/i.test(msg)) {
        friendly = `Couldn't locate "${q}". Add the city and province — e.g. "6408 106 St NW, Edmonton, AB".`;
      } else if (/network|fetch failed|typeerror.*fetch/i.test(msg)) {
        friendly = "Network hiccup reaching the property database. Try again in a moment.";
      } else if (/api key|rentcast|configure/i.test(msg)) {
        friendly = msg;  // These are already clear, come from the API layer
      } else {
        friendly = msg || "Lookup failed. Try adding the city and province to your address.";
      }
      setError(friendly);
      setCompsLoading(false);
    }
    setLoading(false);
  }

  function handleKey(e) { if (e.key === "Enter") search(); }

  function goToStrategy(s, overrides = {}) {
    const soldPrices  = (saleComps?.soldComps || []).map(c => c.price).filter(Boolean);
    const rentPrices  = (rentComps?.rentComps  || []).map(c => c.rent).filter(Boolean);
    const caPrices    = (caComps?.activeListings || []).map(l => l.price).filter(Boolean);
    const compArv     = median(soldPrices) || caComps?.stats?.medianActivePrice || median(caPrices);
    const compRent    = median(rentPrices) || rentComps?.rentAvmData?.rent;

    const prefill = {
      strategy:      s.id,
      timestamp:     Date.now(),
      address:       property?.address    || query,
      searchQuery:   query,
      estimatedValue:overrides.arv  || compArv || property?.estimatedValue  || null,
      rentEstimate:  overrides.rent || compRent || property?.rentEstimate    || null,
      squareFootage: property?.squareFootage  || null,
      bedrooms:      property?.bedrooms       || null,
      bathrooms:     property?.bathrooms      || null,
      yearBuilt:     property?.yearBuilt      || null,
      propertyTaxes: property?.propertyTaxes  || null,
      propertyType:  property?.propertyType   || null,
    };
    localStorage.setItem("rde_prefill", JSON.stringify(prefill));

    // Belt + suspenders: pass address/value via URL params too. Downstream
    // calculators (BRRRR, Commercial, Rehab, Tax) already read these, but
    // until now this navigate dropped them on the floor — so the user landed
    // at a blank calc and re-typed the address they'd just searched for.
    const params = new URLSearchParams();
    if (prefill.address)        params.set("addr", prefill.address);
    if (prefill.estimatedValue) params.set("purchase", String(Math.round(prefill.estimatedValue)));
    if (prefill.rentEstimate)   params.set("rent", String(Math.round(prefill.rentEstimate)));
    if (prefill.yearBuilt)      params.set("year", String(prefill.yearBuilt));
    if (prefill.squareFootage)  params.set("sqft", String(prefill.squareFootage));
    if (prefill.bedrooms)       params.set("beds", String(prefill.bedrooms));
    const qs = params.toString();
    navigate(qs ? `${s.route}?${qs}` : s.route);
  }

  const mapAddr  = encodeURIComponent(property?.searchQuery || query);
  const hasData  = property && !property.notFound;

  // Derived comp stats
  const soldComps      = saleComps?.soldComps      || [];
  const activeListings = saleComps?.activeListings || [];
  const rentCompsList  = rentComps?.rentComps       || [];
  const activeRentals  = rentComps?.activeRentals   || [];
  const saleStats      = saleComps?.stats           || {};
  const rentStats      = rentComps?.stats           || {};
  const avmData        = saleComps?.avmData         || {};
  const rentAvmData    = rentComps?.rentAvmData     || {};

  const suggestedARV  = avmData.price  || saleStats.medianSoldPrice || caComps?.stats?.medianActivePrice || null;
  const suggestedRent = rentAvmData.rent || rentStats.medianRent     || null;
  const arvLow        = avmData.priceLow   || (suggestedARV ? Math.round(suggestedARV * 0.93) : null);
  const arvHigh       = avmData.priceHigh  || (suggestedARV ? Math.round(suggestedARV * 1.07) : null);
  const rentLow       = rentAvmData.rentLow  || (suggestedRent ? Math.round(suggestedRent * 0.92) : null);
  const rentHigh      = rentAvmData.rentHigh || (suggestedRent ? Math.round(suggestedRent * 1.08) : null);

  const hasComps = soldComps.length > 0 || activeListings.length > 0 || activeRentals.length > 0 || rentCompsList.length > 0;
  const hasCaComps = !!caComps;

  return (
    <div className="ph-wrap">
      <style>{CSS}</style>

      {/* First-signup onboarding tour — auto-shows once for new users,
          dismissible via the X. Manual re-trigger via TopNav account menu's
          "Take the tour" item. */}
      <OnboardingTour />

      {/* Nav */}
      <nav className="ph-nav">
        <a href="/" className="ph-logo"><span>Real</span> Deal</a>
        <div className="ph-nav-right">
          <a href="/analyze"    className="ph-nav-link active">Search</a>
          <a href="/app"        className="ph-nav-link">Flip</a>
          <a href="/brrrr"      className="ph-nav-link">BRRRR</a>
          <a href="/commercial" className="ph-nav-link">Multifamily</a>
          <a href="/worth"      className="ph-nav-link">Estimate Value</a>
          <a href="/pricing"    className="ph-nav-link">Pricing</a>
          {user
            ? <button className="ph-nav-ghost" onClick={signOut}>Sign out</button>
            : <a href="/login" style={{background:"var(--blue)",color:"#fff",borderRadius:7,padding:"7px 14px",fontSize:13,fontWeight:600,textDecoration:"none"}}>Sign in</a>}
        </div>
      </nav>

      {/* Hero / Search */}
      <div className="ph-hero">
        <div className="ph-glow" />
        <div className="ph-hero-tag">🏠 Live Property Intelligence</div>
        <h1>Type an address.<br /><span>Get everything.</span></h1>
        <p>Value, rent, sold comps, active listings, rental comps — then run the deal as a flip, BRRRR, or rental. Numbers auto-fill.</p>

        {/* Canonical-page hint: /property delivers zoning + AI thesis + permits
            + Canadian open-data fallback on top of everything here. Hubs the
            user toward the deeper intel page; deep-links the current query. */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          marginTop: 14, marginBottom: 4,
          padding: "8px 14px",
          background: "rgba(167,130,255,0.07)",
          border: "1px solid rgba(167,130,255,0.28)",
          borderRadius: 999,
          fontSize: 12, fontWeight: 600, color: "var(--text)",
        }}>
          <span style={{ color: "var(--purple)", fontWeight: 700 }}>NEW</span>
          <span>Want zoning + permits + AI thesis too?</span>
          <a
            href={query ? `/property?address=${encodeURIComponent(query)}` : "/property"}
            style={{
              color: "var(--purple)", fontWeight: 800, textDecoration: "none",
              borderLeft: "1px solid rgba(167,130,255,0.4)", paddingLeft: 10,
            }}
          >📍 FULL PROPERTY INTEL →</a>
        </div>

        <div className="ph-search-wrap">
          {xrayPrefill && (
            <XrayPrefillBanner
              data={xrayPrefill}
              onClear={() => { clearXrayPrefill(); setXrayPrefill(null); }}
            />
          )}
          <div className="ph-search-box" data-tour="search">
            <span className="ph-search-icon">📍</span>
            <AddressAutocomplete
              className="ph-search-input"
              placeholder="123 Main St, Phoenix, AZ 85001 or 123 Main St, Calgary, AB"
              value={query}
              onChange={setQuery}
              onSelect={(addr) => { setQuery(addr); }}
              onKeyDown={handleKey}
              style={{ flex: 1 }}
            />
            <button className="ph-search-btn" onClick={search} disabled={loading || !query.trim()}>
              {loading ? "Searching…" : "Analyze →"}
            </button>
          </div>
          <div className="ph-search-hint">
            US &amp; Canadian addresses supported &nbsp;·&nbsp;
            <span onClick={() => navigate(`/property?address=${encodeURIComponent(query)}`)} style={{color:"#ffb43c",cursor:"pointer",fontWeight:600}}>Don't know the value? Estimate it free →</span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="ph-loading">
          <div className="ph-spinner" />
          <div style={{fontSize:14,fontWeight:600}}>Looking up property data…</div>
          <div style={{fontSize:12,marginTop:4}}>Pulling public records, AVM, and comps</div>
        </div>
      )}

      {/* Results */}
      {!loading && property && (
        <div className="ph-results">

          {/* Address header */}
          <div className="ph-prop-header">
            <div>
              <div className="ph-prop-address">{property.address || query}</div>
              <div className="ph-prop-sub">
                {hasData ? "Property found in public records" : "Showing map — property data not available"}
              </div>
            </div>
            {hasData && property.propertyType && (
              <div className="ph-prop-type">🏠 {property.propertyType}</div>
            )}
          </div>

          {/* ── OVERALL VERDICT BANNER · pitch-week showcase ────────────
              The one-answer synthesis a broker or investor wants BEFORE
              seeing any detail. Derived from Building Grade + zoning +
              CMHC + AVM. Displays the moment the property loads;
              refines as async data lands. */}
          {hasData && (
            <OverallVerdictBanner
              property={property}
              cityData={cityData}
              buildingGrade={buildingGrade}
            />
          )}

          {/* ── SELL · LEASE hero card — same headline answer the /property
              page surfaces. Auto-pulls the strongest available signals; no
              user input required. Stays consistent across both lookup pages. */}
          {hasData && (property.estimatedValue || property.rentEstimate) && (() => {
            const sellMid  = property.estimatedValue;
            const sellLow  = property.estimatedValueLow;
            const sellHigh = property.estimatedValueHigh;
            const rentMid  = property.rentEstimate;
            const rentLow  = property.rentEstimateLow;
            const rentHigh = property.rentEstimateHigh;
            const sellPpsf = sellMid && property.squareFootage ? Math.round(sellMid / property.squareFootage) : null;
            const grossYield = sellMid && rentMid ? (rentMid * 12) / sellMid : null;
            const fmtBig = n => n ? `$${Math.round(n).toLocaleString()}` : "—";
            const fmtK   = n => n ? `$${Math.round(n/1000)}K` : "—";
            return (
              <div style={{
                margin: "0 0 20px",
                background: "linear-gradient(135deg, rgba(22,163,74,0.06) 0%, rgba(0,102,204,0.05) 100%)",
                border: "1px solid var(--borderf)",
                borderRadius: 10,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 18px",
                  background: "rgba(15,23,42,0.04)",
                  borderBottom: "1px solid var(--borderf)",
                  fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700,
                  color: "var(--sub)", letterSpacing: "1.6px",
                }}>
                  ▸ MARKET VALUATION · LIVE FROM PUBLIC RECORDS
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: sellMid && rentMid ? "1fr 1fr" : "1fr",
                  gap: 1,
                  background: "var(--borderf)",
                }}>
                  {sellMid && (
                    <div style={{ background: "var(--card)", padding: "22px 24px" }}>
                      <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700, color: "var(--green)", letterSpacing: "1.4px", marginBottom: 8 }}>
                        💰 WHAT IT SELLS FOR
                      </div>
                      <div style={{ fontFamily: "'Geist',sans-serif", fontSize: 38, fontWeight: 800, color: "var(--text)", letterSpacing: "-1.5px", lineHeight: 1 }}>
                        {fmtBig(sellMid)}
                      </div>
                      {sellLow && sellHigh && (
                        <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginTop: 6 }}>
                          Range  {fmtK(sellLow)} — {fmtK(sellHigh)}
                        </div>
                      )}
                      {sellPpsf && (
                        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6, fontFamily: "'Geist Mono',monospace" }}>
                          ${sellPpsf}/sqft · {property.squareFootage.toLocaleString()} sqft
                        </div>
                      )}
                    </div>
                  )}
                  {rentMid && (
                    <div style={{ background: "var(--card)", padding: "22px 24px" }}>
                      <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.4px", marginBottom: 8 }}>
                        🏘️ WHAT IT LEASES FOR
                      </div>
                      <div style={{ fontFamily: "'Geist',sans-serif", fontSize: 38, fontWeight: 800, color: "var(--text)", letterSpacing: "-1.5px", lineHeight: 1 }}>
                        {fmtBig(rentMid)}
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--sub)", marginLeft: 6 }}>/ mo</span>
                      </div>
                      {rentLow && rentHigh && (
                        <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, color: "var(--sub)", marginTop: 6 }}>
                          Range  ${Math.round(rentLow).toLocaleString()} — ${Math.round(rentHigh).toLocaleString()}
                        </div>
                      )}
                      {grossYield && (
                        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6, fontFamily: "'Geist Mono',monospace" }}>
                          Gross yield {(grossYield * 100).toFixed(1)}% · ${Math.round(rentMid * 12).toLocaleString()}/yr
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{
                  padding: "9px 18px",
                  background: "rgba(15,23,42,0.03)",
                  borderTop: "1px solid var(--borderf)",
                  fontSize: 11, color: "var(--dim)", lineHeight: 1.5,
                }}>
                  Auto-sourced from public records. Verify with active comps before listing.
                </div>
              </div>
            );
          })()}

          {/* Error + fallback */}
          {error && (
            <div>
              <div className="ph-error">⚠️ {error}</div>
              <div style={{marginTop:12,marginBottom:20,padding:"14px 18px",background:"rgba(255,180,60,0.06)",border:"1px solid rgba(255,180,60,0.2)",borderRadius: 10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#ffb43c",marginBottom:3}}>Don't have the property value?</div>
                  <div style={{fontSize:12,color:"var(--sub)"}}>Use our free estimator — get value range, rent estimate & cash flow instantly.</div>
                </div>
                <button onClick={() => navigate(`/property?address=${encodeURIComponent(query)}`)} style={{background:"linear-gradient(135deg,#ffb43c,var(--amber))",color:"#ffffff",border:"none",borderRadius: 10,padding:"9px 18px",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
                  Estimate Value →
                </button>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="ph-map">
            <iframe
              title="property-map"
              src={`https://maps.google.com/maps?q=${mapAddr}&output=embed&z=17&t=k`}
              loading="lazy"
              allowFullScreen
            />
            <div className="ph-map-btns">
              <a href={`https://www.google.com/maps/search/${mapAddr}`} target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(59,158,255,0.12)",color:"var(--blue)"}}>🗺️ Google Maps</a>
              <a href={`https://www.google.com/maps?q=${mapAddr}&layer=c`} target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(52,217,138,0.1)",color:"var(--green)"}}>🚶 Street View</a>
              <a href={`https://www.zillow.com/homes/${mapAddr}_rb/`} target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(0,106,255,0.12)",color:"#5aadff"}}>🔵 Zillow</a>
              <a href={`https://www.redfin.com/search#location=${mapAddr}`} target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(220,50,50,0.1)",color:"#ff7c7c"}}>🔴 Redfin</a>
              <a href={`https://www.realtor.com/realestateandhomes-search/${mapAddr}`} target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(240,160,48,0.1)",color:"var(--amber)"}}>🏠 Realtor.com</a>
              <a href={
                  caComps?.geocoded
                    ? `https://www.realtor.ca/map#view=list&lat=${caComps.geocoded.lat.toFixed(4)}&lng=${caComps.geocoded.lon.toFixed(4)}&zoom=15`
                    : `https://www.realtor.ca/map#view=list`
                } target="_blank" rel="noopener noreferrer"
                className="ph-map-btn" style={{background:"rgba(167,130,255,0.1)",color:"var(--purple)"}}>🍁 Realtor.ca</a>
            </div>
          </div>

          {/* Property data cards */}
          {hasData && (
            <>
              <div className="ph-data-grid">
                {property.estimatedValue && (
                  <div className="ph-data-card" style={{borderColor:"rgba(52,217,138,0.25)",background:"rgba(52,217,138,0.04)"}}>
                    <div className="ph-data-label">Estimated Value</div>
                    <div className="ph-data-val green">{fmt(property.estimatedValue)}</div>
                    <div className="ph-data-sub">Public records AVM</div>
                  </div>
                )}
                {property.bedrooms && (
                  <div className="ph-data-card">
                    <div className="ph-data-label">Bedrooms</div>
                    <div className="ph-data-val blue">{property.bedrooms} bed</div>
                    {property.bathrooms && <div className="ph-data-sub">{property.bathrooms} bath</div>}
                  </div>
                )}
                {property.squareFootage && (
                  <div className="ph-data-card">
                    <div className="ph-data-label">Square Footage</div>
                    <div className="ph-data-val">{property.squareFootage.toLocaleString()} sqft</div>
                    {property.estimatedValue && (
                      <div className="ph-data-sub">{fmt(property.estimatedValue / property.squareFootage)}/sqft</div>
                    )}
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="ph-data-card">
                    <div className="ph-data-label">Year Built</div>
                    <div className="ph-data-val">{property.yearBuilt}</div>
                    <div className="ph-data-sub">{new Date().getFullYear() - property.yearBuilt} yrs old</div>
                  </div>
                )}
                {property.lotSize && (
                  <div className="ph-data-card">
                    <div className="ph-data-label">Lot Size</div>
                    <div className="ph-data-val">{property.lotSize.toLocaleString()}</div>
                    <div className="ph-data-sub">sq ft</div>
                  </div>
                )}
                {property.propertyTaxes && (
                  <div className="ph-data-card">
                    <div className="ph-data-label">Property Taxes</div>
                    <div className="ph-data-val" style={{color:"var(--amber)"}}>{fmt(property.propertyTaxes)}</div>
                    <div className="ph-data-sub">Per year</div>
                  </div>
                )}
              </div>

              {/* Rent estimate */}
              {property.rentEstimate && (
                <div className="ph-rent-bar">
                  <span className="ph-rent-icon">💰</span>
                  <div className="ph-rent-main">
                    <div className="ph-rent-label">Estimated Monthly Rent</div>
                    <div className="ph-rent-val">{fmt(property.rentEstimate)}<span style={{fontSize:14,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
                    <div className="ph-rent-sub">Based on comparable rentals · {fmt(property.rentEstimate * 12)}/yr</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"var(--sub)",marginBottom:4}}>Gross Rent Multiplier</div>
                    <div style={{fontSize:20,fontWeight:800,color:"var(--blue)"}}>
                      {property.estimatedValue && property.rentEstimate
                        ? (property.estimatedValue / (property.rentEstimate * 12)).toFixed(1) + "x"
                        : "—"}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── STREET VIEW · Google ─────────────────────────────────
              Hero visual card. Renders only when GOOGLE_MAPS_API_KEY is
              configured AND Street View has coverage at (or within 100m of)
              the property's coordinates. Card image is 800x400; hover to
              inspect. Fail-open — hidden when no coverage. */}
          {property?.streetView?.available && (
            <div style={{
              margin: "16px 0",
              padding: 0,
              background: "var(--card)",
              border: "1px solid rgba(66,133,244,0.32)",
              borderLeft: "3px solid #4285f4",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                position: "relative",
                background: "#000",
                lineHeight: 0,
              }}>
                <img
                  src={property.streetView.cardUrl}
                  alt={`Street View of ${property.address}`}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    maxHeight: 420,
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
                <div style={{
                  position: "absolute",
                  top: 10, left: 12,
                  padding: "4px 10px",
                  background: "rgba(0,0,0,0.72)",
                  color: "#fff",
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  borderRadius: 3,
                  textTransform: "uppercase",
                }}>
                  ▸ Street View
                </div>
                {property.streetView.panoDate && (
                  <div style={{
                    position: "absolute",
                    top: 10, right: 12,
                    padding: "3px 8px",
                    background: "rgba(0,0,0,0.72)",
                    color: "#fff",
                    fontFamily: "'Geist Mono',ui-monospace,monospace",
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: "1px",
                    borderRadius: 3,
                  }}>
                    Imagery: {property.streetView.panoDate}
                  </div>
                )}
                <div style={{
                  position: "absolute",
                  bottom: 8, right: 12,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  letterSpacing: "0.5px",
                }}>
                  © Google
                </div>
              </div>
            </div>
          )}

          {/* ── MUNICIPAL OPEN DATA · zoning + permits + year built ──────
              Free hyperlocal data from city open-data portals (Vancouver,
              Calgary, Edmonton, Toronto). Different cut than the AI Building
              Grade — this is the raw municipal record: zoning code, assessed
              values, recent permits, nearby development apps. */}
          {hasData && cityData && !cityData.error && (
            <div style={{
              margin: "16px 0",
              padding: "18px 20px",
              background: "linear-gradient(180deg,rgba(33,85,205,0.04) 0%,var(--card) 100%)",
              border: "1px solid rgba(33,85,205,0.32)",
              borderLeft: "3px solid #2155cd",
              borderRadius: 8,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#2155cd",textTransform:"uppercase"}}>
                  ▸ Municipal Open Data · {cityData.city?.toUpperCase()}
                </div>
                <span style={{
                  marginLeft:"auto",fontFamily:"'Geist Mono',ui-monospace,monospace",
                  fontSize:10,fontWeight:600,color:"var(--dim)",
                  border:"1px solid var(--borderf)",padding:"3px 8px",borderRadius:3,
                }}>
                  Source: {cityData.source?.split("(")[1]?.replace(")","") || cityData.source}
                </span>
              </div>
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",
                gap:10,
                marginBottom: (cityData.nearbyPermits?.length || cityData.nearbyDevelopmentApplications?.length) ? 14 : 0,
              }}>
                {cityData.zoning && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Zoning</div>
                    <div style={{fontSize:14,fontWeight:700,color:"#2155cd"}}>{cityData.zoning}</div>
                  </div>
                )}
                {cityData.propertyClass && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Property Class</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--alabaster)"}}>{cityData.propertyClass}</div>
                  </div>
                )}
                {cityData.yearBuilt && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Year Built</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--alabaster)"}}>{cityData.yearBuilt}</div>
                  </div>
                )}
                {cityData.assessedTotal && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Assessed Total</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>${(cityData.assessedTotal || 0).toLocaleString()}</div>
                  </div>
                )}
                {cityData.taxLevy && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Annual Tax Levy</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--alabaster)"}}>${(cityData.taxLevy || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>
              {(cityData.nearbyPermits?.length > 0 || cityData.nearbyDevelopmentApplications?.length > 0) && (
                <div style={{
                  display:"grid",
                  gridTemplateColumns: cityData.nearbyPermits?.length && cityData.nearbyDevelopmentApplications?.length ? "1fr 1fr" : "1fr",
                  gap:12,
                }}>
                  {cityData.nearbyPermits?.length > 0 && (
                    <div style={{padding:12,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                      <div style={{fontSize:10,color:"#2155cd",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>
                        ▸ {cityData.nearbyPermits.length} Recent permit{cityData.nearbyPermits.length === 1 ? "" : "s"} nearby
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:120,overflowY:"auto"}}>
                        {cityData.nearbyPermits.slice(0, 5).map((p, i) => (
                          <div key={i} style={{fontSize:11.5,color:"var(--sub)",lineHeight:1.4}}>
                            <span style={{color:"var(--alabaster)",fontWeight:600}}>{p.type || p.workClass || "Permit"}</span>
                            {p.value && <span style={{color:"var(--green)",marginLeft:6}}>${Number(p.value).toLocaleString()}</span>}
                            {p.address && <div style={{fontSize:10.5,color:"var(--dim)"}}>{p.address}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {cityData.nearbyDevelopmentApplications?.length > 0 && (
                    <div style={{padding:12,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                      <div style={{fontSize:10,color:"#d4af37",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>
                        ▸ {cityData.nearbyDevelopmentApplications.length} Active dev application{cityData.nearbyDevelopmentApplications.length === 1 ? "" : "s"} nearby
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:120,overflowY:"auto"}}>
                        {cityData.nearbyDevelopmentApplications.slice(0, 5).map((d, i) => (
                          <div key={i} style={{fontSize:11.5,color:"var(--sub)",lineHeight:1.4}}>
                            <span style={{color:"var(--alabaster)",fontWeight:600}}>{d.type || d.status || "Application"}</span>
                            {d.address && <div style={{fontSize:10.5,color:"var(--dim)"}}>{d.address}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NEIGHBORHOOD CONTEXT · Wikipedia ────────────────────────
              Free public profile: population, boundaries, history.
              Populated when property-lookup's assessment returns a
              neighbourhood name AND Wikipedia has a "Name, City" page. */}
          {property?.neighbourhoodProfile?.extract && (
            <div style={{
              margin: "16px 0",
              padding: "18px 20px",
              background: "linear-gradient(180deg,rgba(139,92,246,0.04) 0%,var(--card) 100%)",
              border: "1px solid rgba(139,92,246,0.32)",
              borderLeft: "3px solid #8b5cf6",
              borderRadius: 8,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#8b5cf6",textTransform:"uppercase"}}>
                  ▸ Neighborhood · {property.neighbourhoodProfile.title || property.neighbourhood}
                </div>
                <span style={{
                  marginLeft:"auto",fontFamily:"'Geist Mono',ui-monospace,monospace",
                  fontSize:10,fontWeight:600,color:"var(--dim)",
                  border:"1px solid var(--borderf)",padding:"3px 8px",borderRadius:3,
                }}>
                  Source: Wikipedia
                </span>
              </div>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                {property.neighbourhoodProfile.thumbnail && (
                  <img
                    src={property.neighbourhoodProfile.thumbnail}
                    alt=""
                    style={{width:100,height:100,objectFit:"cover",borderRadius:6,border:"1px solid var(--borderf)",flexShrink:0}}
                  />
                )}
                <div style={{flex:1,fontSize:13,lineHeight:1.55,color:"var(--alabaster)"}}>
                  {property.neighbourhoodProfile.extract}
                  {property.neighbourhoodProfile.url && (
                    <a
                      href={property.neighbourhoodProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{marginLeft:6,color:"#8b5cf6",textDecoration:"none",fontWeight:600}}
                    >
                      Read more →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── NEARBY AMENITIES · OpenStreetMap ────────────────────────
              Free, no key. Walkable schools/transit/grocery/restaurants/parks
              within tuned radii (transit 500m, restaurants 500m, schools 1.2km).
              Real estate value proxy — every walkable amenity moves the needle. */}
          {property?.nearbyAmenities && (
            <div style={{
              margin: "16px 0",
              padding: "18px 20px",
              background: "linear-gradient(180deg,rgba(34,197,94,0.04) 0%,var(--card) 100%)",
              border: "1px solid rgba(34,197,94,0.32)",
              borderLeft: "3px solid #22c55e",
              borderRadius: 8,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#22c55e",textTransform:"uppercase"}}>
                  ▸ Walkable Amenities · Within a Short Walk
                </div>
                <span style={{
                  marginLeft:"auto",fontFamily:"'Geist Mono',ui-monospace,monospace",
                  fontSize:10,fontWeight:600,color:"var(--dim)",
                  border:"1px solid var(--borderf)",padding:"3px 8px",borderRadius:3,
                }}>
                  Source: OpenStreetMap
                </span>
              </div>
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",
                gap:10,
              }}>
                {[
                  { key: "schools",     label: "Schools",     icon: "🎓", radius: "1.2km" },
                  { key: "transit",     label: "Transit",     icon: "🚌", radius: "500m"  },
                  { key: "grocery",     label: "Grocery",     icon: "🛒", radius: "800m"  },
                  { key: "restaurants", label: "Restaurants", icon: "🍽️", radius: "500m"  },
                  { key: "parks",       label: "Parks",       icon: "🌳", radius: "800m"  },
                ].map(({ key, label, icon, radius }) => {
                  const bucket = property.nearbyAmenities[key];
                  if (!bucket) return null;
                  return (
                    <div key={key} style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                      <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>
                        {icon} {label} · {radius}
                      </div>
                      <div style={{fontSize:18,fontWeight:700,color:bucket.count > 0 ? "#22c55e" : "var(--dim)"}}>
                        {bucket.count}
                      </div>
                      {bucket.nearest?.[0] && (
                        <div style={{fontSize:10,color:"var(--sub)",marginTop:3,lineHeight:1.35}}>
                          Closest: <span style={{color:"var(--alabaster)"}}>{bucket.nearest[0].name}</span> ({bucket.nearest[0].distance}m)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FINANCING CONTEXT · Bank of Canada rates ────────────────
              Current prime + 5yr conventional + overnight. Auto-fires on
              every property lookup. Useful for underwriting sanity checks. */}
          {property?.rates?.prime?.rate && (
            <div style={{
              margin: "16px 0",
              padding: "14px 18px",
              background: "linear-gradient(180deg,rgba(251,146,60,0.04) 0%,var(--card) 100%)",
              border: "1px solid rgba(251,146,60,0.32)",
              borderLeft: "3px solid #fb923c",
              borderRadius: 8,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#fb923c",textTransform:"uppercase"}}>
                  ▸ Financing Context · Current Rates
                </div>
                <span style={{
                  marginLeft:"auto",fontFamily:"'Geist Mono',ui-monospace,monospace",
                  fontSize:10,fontWeight:600,color:"var(--dim)",
                  border:"1px solid var(--borderf)",padding:"3px 8px",borderRadius:3,
                }}>
                  Source: Bank of Canada
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10}}>
                {property.rates.prime?.rate && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>Prime rate</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#fb923c"}}>{property.rates.prime.rate.toFixed(2)}%</div>
                    <div style={{fontSize:9,color:"var(--sub)",marginTop:3}}>as of {property.rates.prime.date}</div>
                  </div>
                )}
                {property.rates.mortgage5yr?.rate && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>5yr conventional</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--alabaster)"}}>{property.rates.mortgage5yr.rate.toFixed(2)}%</div>
                    <div style={{fontSize:9,color:"var(--sub)",marginTop:3}}>as of {property.rates.mortgage5yr.date}</div>
                  </div>
                )}
                {property.rates.overnight?.rate && (
                  <div style={{padding:10,background:"rgba(0,12,31,0.4)",borderRadius:6,border:"1px solid var(--borderf)"}}>
                    <div style={{fontSize:10,color:"var(--dim)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"1px",textTransform:"uppercase",marginBottom:3}}>BoC overnight</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--alabaster)"}}>{property.rates.overnight.rate.toFixed(2)}%</div>
                    <div style={{fontSize:9,color:"var(--sub)",marginTop:3}}>as of {property.rates.overnight.date}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BUILDING GRADE · 4-dimension institutional read ────────
              Auto-fires once the property's assessed value lands. Same
              4-cell grade card the X-Ray bar and Property Intel surface. */}
          {hasData && (buildingGradeLoading || buildingGrade?.overall) && (
            <div style={{
              margin: "16px 0",
              padding: "18px 20px",
              background: "linear-gradient(180deg,rgba(212,175,55,0.04) 0%,var(--card) 100%)",
              border: "1px solid rgba(212,175,55,0.32)",
              borderLeft: "3px solid #d4af37",
              borderRadius: 8,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#d4af37",textTransform:"uppercase"}}>
                  ▸ Building Grade · 4-dimension institutional read
                </div>
                {buildingGrade?.overall && (
                  <span style={{
                    marginLeft:"auto",fontFamily:"'Geist',sans-serif",
                    fontSize:13,fontWeight:800,color:"#d4af37",letterSpacing:1,
                    border:"1px solid #d4af37",padding:"4px 10px",borderRadius:3,
                    background:"rgba(212,175,55,0.06)",
                  }}>
                    {buildingGrade.overall} · CLASS {buildingGrade.class}
                  </span>
                )}
              </div>
              {buildingGradeLoading && !buildingGrade ? (
                <div style={{fontSize:13,color:"var(--sub)",fontStyle:"italic"}}>
                  Grading architecture, systems, amenities, site…
                </div>
              ) : (
                <>
                  <div className="bg-grade-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    {(buildingGrade.dimensions || []).map(d => (
                      <div key={d.name} style={{
                        display:"flex",alignItems:"flex-start",gap:12,
                        background:"rgba(255,255,255,0.6)",
                        border:"1px solid rgba(212,175,55,0.2)",
                        borderLeft:"2px solid #d4af37",borderRadius:4,padding:"10px 12px",
                      }}>
                        <div style={{
                          fontFamily:"'Geist',sans-serif",fontSize:22,fontWeight:800,
                          color:"#d4af37",letterSpacing:"-0.5px",lineHeight:1,
                          width:44,height:44,border:"1.5px solid #d4af37",borderRadius:4,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,background:"rgba(212,175,55,0.06)",
                        }}>{d.grade}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:9.5,fontWeight:700,letterSpacing:"0.8px",color:"var(--sub)",textTransform:"uppercase",marginBottom:4}}>{d.name}</div>
                          <div style={{fontSize:12,color:"var(--text)",lineHeight:1.45}}>{d.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {buildingGrade.summary && (
                    <div style={{
                      marginTop:6,padding:"10px 12px",
                      background:"rgba(0,102,204,0.06)",
                      border:"1px solid rgba(0,102,204,0.22)",
                      borderLeft:"2px solid var(--blue)",borderRadius:4,
                      fontSize:12.5,color:"var(--text)",lineHeight:1.5,fontStyle:"italic",
                    }}>
                      {buildingGrade.summary}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── LOSS-TO-LEASE · rent roll → CMHC delta ────────────────
              Brass-bordered drag-drop zone. When a PDF lands, the
              LossToLeasePanel renders the per-door stranded upside math. */}
          {hasData && (
            <div style={{margin:"16px 0"}}>
              <div
                onClick={() => document.getElementById("ph-ltl-input")?.click()}
                style={{
                  display:"flex",alignItems:"center",gap:14,
                  padding:"14px 16px",
                  background:"linear-gradient(180deg,rgba(212,175,55,0.05),rgba(0,102,204,0.04))",
                  border:"1px solid rgba(212,175,55,0.32)",
                  borderLeft:"3px solid #d4af37",
                  borderRadius:6,cursor:"pointer",
                }}>
                <div style={{fontSize:24}}>📊</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:11,fontWeight:700,letterSpacing:"1.2px",color:"#d4af37",textTransform:"uppercase",marginBottom:3}}>
                    Loss-to-Lease · drop a rent roll PDF
                  </div>
                  <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>
                    {ltlLoading
                      ? "Reading rent roll · cross-referencing CMHC · computing per-door upside…"
                      : ltlError
                        ? <span style={{color:"var(--red)"}}>⚠ {ltlError}</span>
                        : ltlData?.ok
                          ? <span style={{color:"var(--green)"}}>✓ Analyzed — see panel below</span>
                          : <>Find the stranded upside on this address · multifamily rent rolls only</>}
                  </div>
                </div>
                <input
                  type="file"
                  id="ph-ltl-input"
                  accept="application/pdf"
                  style={{display:"none"}}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) runLossToLease(f);
                    e.target.value = "";
                  }}
                />
              </div>
              {ltlData && <LossToLeasePanel data={ltlData} />}
            </div>
          )}

          {/* ── COMPS LOADING ─────────────────────────────────────────── */}
          {compsLoading && (
            <div className="ph-comps-loading">
              <div className="ph-mini-spin" />
              Fetching sold comps, active listings &amp; rental comps…
            </div>
          )}

          {/* ── MLS COMPS UPSELL — Canadian addresses without Repliers wired ──
              Replaces the previously-blank section with a clean,
              brand-honest card. Triggers when /api/comps returns
              source:"none" + notConfigured:"repliers". */}
          {!compsLoading && saleComps?.notConfigured === "repliers" && !hasCaComps && (
            <>
              <div className="ph-section-divider" />
              <div style={{
                margin: "16px 0",
                padding: "20px 22px",
                background: "linear-gradient(180deg,rgba(212,175,55,0.06) 0%,rgba(255,255,255,0.4) 100%)",
                border: "1px solid rgba(212,175,55,0.32)",
                borderLeft: "3px solid #d4af37",
                borderRadius: 8,
              }}>
                <div style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "1.4px",
                  color: "#d4af37", textTransform: "uppercase", marginBottom: 8,
                }}>
                  ▸ Sale + active comps · CREA feed
                </div>
                <div style={{fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.4}}>
                  Real Canadian MLS comps for this address require a Pro subscription.
                </div>
                <div style={{fontSize: 13, color: "var(--sub)", lineHeight: 1.6, marginBottom: 12}}>
                  Active listings, recent sale comps (last 6 months), and rental comps via the CREA feed.
                  This address is in a covered Canadian market — the data is one subscription away.
                  Free during launch for the first 50 paying users.
                </div>
                <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
                  <button
                    onClick={() => navigate("/pricing")}
                    style={{
                      background: "var(--blue)", color: "#fff", border: "1px solid #d4af37",
                      borderRadius: 6, padding: "10px 18px",
                      fontFamily: "'Geist Mono',ui-monospace,monospace",
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.6px",
                      textTransform: "uppercase", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(212,175,55,0.25)"; }}
                    onMouseOut={e  => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    See pricing →
                  </button>
                  <button
                    onClick={() => navigate(`/property?address=${encodeURIComponent(query)}`)}
                    style={{
                      background: "transparent", color: "var(--text)",
                      border: "1px solid var(--borderf)", borderRadius: 6,
                      padding: "10px 18px",
                      fontFamily: "'Geist Mono',ui-monospace,monospace",
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.6px",
                      textTransform: "uppercase", cursor: "pointer",
                    }}>
                    Full property intel →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── EMPTY COMPS — configured but no matches in 6mo window ──
              Different message from the upsell: tell the user the address
              is covered but no recent transactions, so they don't think
              the platform is broken. */}
          {!compsLoading && saleComps?.source === "repliers"
            && (saleComps.soldComps?.length ?? 0) === 0
            && (saleComps.activeListings?.length ?? 0) === 0
            && !hasCaComps && (
            <>
              <div className="ph-section-divider" />
              <div style={{
                margin: "16px 0", padding: "16px 18px",
                background: "rgba(0,102,204,0.04)",
                border: "1px solid rgba(0,102,204,0.22)",
                borderLeft: "2px solid var(--blue)",
                borderRadius: 6,
              }}>
                <div style={{fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700, color: "var(--blue)", letterSpacing: "1.2px", marginBottom: 6}}>
                  ▸ No comps in the 6-month window
                </div>
                <div style={{fontSize: 13, color: "var(--text)", lineHeight: 1.55}}>
                  This address is in a covered Canadian market but no sale or rental activity matched
                  within 1km in the last 180 days. Try a more central address, or extend the search radius
                  in your saved searches.
                </div>
              </div>
            </>
          )}

          {/* ── MARKET SNAPSHOT ───────────────────────────────────────── */}
          {!compsLoading && hasComps && !hasCaComps && (
            <>
              <div className="ph-section-divider" />
              <div style={{fontSize:13,fontWeight:800,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>
                📊 Market Snapshot · 0.5mi radius
              </div>
              <div className="ph-market-snap">
                <div className="ph-snap-card">
                  <div className="ph-snap-label">Median Sold Price</div>
                  <div className="ph-snap-val" style={{color:"var(--green)"}}>{saleStats.medianSoldPrice ? fmt(saleStats.medianSoldPrice) : "—"}</div>
                  <div className="ph-snap-sub">{saleStats.soldCount || 0} recent comps</div>
                </div>
                <div className="ph-snap-card">
                  <div className="ph-snap-label">Median $/sqft</div>
                  <div className="ph-snap-val" style={{color:"var(--blue)"}}>{saleStats.medianSoldPsf ? fmt(saleStats.medianSoldPsf) : "—"}</div>
                  <div className="ph-snap-sub">sold comps avg</div>
                </div>
                <div className="ph-snap-card">
                  <div className="ph-snap-label">Active Listings</div>
                  <div className="ph-snap-val">{saleStats.activeCount ?? "—"}</div>
                  <div className="ph-snap-sub">within 0.5 miles</div>
                </div>
                <div className="ph-snap-card">
                  <div className="ph-snap-label">Median Rent</div>
                  <div className="ph-snap-val" style={{color:"var(--green)"}}>{rentStats.medianRent ? fmt(rentStats.medianRent) : "—"}</div>
                  <div className="ph-snap-sub">{rentStats.activeCount || 0} active rentals</div>
                </div>
              </div>

              {/* ── ARV Suggestion ──────────────────────────────────────── */}
              {suggestedARV && (
                <div className="ph-suggest arv">
                  <div>
                    <div className="ph-suggest-label">🏷️ Comp-Based ARV Estimate</div>
                    <div className="ph-suggest-val">{fmt(suggestedARV)}</div>
                    <div className="ph-suggest-range">
                      Range: {arvLow ? fmt(arvLow) : "—"} – {arvHigh ? fmt(arvHigh) : "—"} &nbsp;·&nbsp; Based on {saleStats.soldCount || "recent"} sold comps
                    </div>
                  </div>
                  <div className="ph-suggest-btns">
                    <button className="ph-suggest-btn flip" onClick={() => goToStrategy(STRATEGIES[0], { arv: suggestedARV })}>Use in Flip →</button>
                    <button className="ph-suggest-btn brrrr" onClick={() => goToStrategy(STRATEGIES[1], { arv: suggestedARV })}>Use in BRRRR →</button>
                  </div>
                </div>
              )}

              {/* ── Rent Suggestion ─────────────────────────────────────── */}
              {suggestedRent && (
                <div className="ph-suggest rent">
                  <div>
                    <div className="ph-suggest-label">💰 Comp-Based Rent Estimate</div>
                    <div className="ph-suggest-val">{fmt(suggestedRent)}<span style={{fontSize:14,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
                    <div className="ph-suggest-range">
                      Range: {rentLow ? fmtRent(rentLow) : "—"} – {rentHigh ? fmtRent(rentHigh) : "—"} &nbsp;·&nbsp; Based on {rentStats.compsCount || "active"} rental comps
                    </div>
                  </div>
                  <div className="ph-suggest-btns">
                    <button className="ph-suggest-btn brrrr" onClick={() => goToStrategy(STRATEGIES[1], { rent: suggestedRent })}>Use in BRRRR →</button>
                    <button className="ph-suggest-btn mf" onClick={() => goToStrategy(STRATEGIES[2], { rent: suggestedRent })}>Use in Multifamily →</button>
                  </div>
                </div>
              )}

              {/* ── Sold Comps Table ────────────────────────────────────── */}
              {soldComps.length > 0 && (
                <div className="ph-comps-section">
                  <div className="ph-comps-head">
                    <div className="ph-comps-title">
                      🏘️ Sold Comparables
                      <span className="ph-comps-badge">{soldComps.length} comps</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>Used to calculate ARV above</div>
                  </div>
                  <div className="ph-comps-wrap">
                    <table className="ph-comps-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Bed/Ba</th>
                          <th>Sqft</th>
                          <th>Sold Price</th>
                          <th>$/sqft</th>
                          <th>Distance</th>
                          <th>Sold</th>
                          <th>Match</th>
                          <th>Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {soldComps.map((c, i) => (
                          <tr key={i}>
                            <td><div className="ph-comp-addr" title={c.address}>{shortAddr(c.address)}</div></td>
                            <td style={{color:"var(--sub)"}}>{c.bedrooms ?? "—"}/{c.bathrooms ?? "—"}</td>
                            <td style={{color:"var(--sub)"}}>{c.squareFootage ? c.squareFootage.toLocaleString() : "—"}</td>
                            <td style={{fontWeight:700,color:"var(--green)"}}>{c.price ? fmt(c.price) : "—"}</td>
                            <td style={{color:"var(--blue)"}}>{c.psf ? fmt(c.psf) : "—"}</td>
                            <td style={{color:"var(--sub)"}}>{c.distance ? `${c.distance.toFixed(2)}mi` : "—"}</td>
                            <td style={{color:"var(--sub)"}}>{daysAgo(c.daysOld)}</td>
                            <td>
                              {c.correlation != null ? (
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <div style={{width:44,height:6,borderRadius:3,background:"var(--borderf)",overflow:"hidden"}}>
                                    <div style={{width:`${Math.round(c.correlation*100)}%`,height:"100%",background:"var(--green)",borderRadius:3}} />
                                  </div>
                                  <span style={{fontSize:10,color:"var(--sub)"}}>{Math.round(c.correlation * 100)}%</span>
                                </div>
                              ) : "—"}
                            </td>
                            <td><ListingSiteLinks address={c.address} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Active Sale Listings ─────────────────────────────────── */}
              {activeListings.length > 0 && (
                <div className="ph-comps-section">
                  <div className="ph-comps-head">
                    <div className="ph-comps-title">
                      🟢 Active Listings Nearby
                      <span className="ph-comps-badge">{activeListings.length} listings</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>Competition &amp; current market pricing</div>
                  </div>
                  <div className="ph-comps-wrap">
                    <table className="ph-comps-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Bed/Ba</th>
                          <th>Sqft</th>
                          <th>List Price</th>
                          <th>$/sqft</th>
                          <th>Days Listed</th>
                          <th>Type</th>
                          <th>Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeListings.map((l, i) => (
                          <tr key={i}>
                            <td><div className="ph-comp-addr" title={l.address}>{shortAddr(l.address)}</div></td>
                            <td style={{color:"var(--sub)"}}>{l.bedrooms ?? "—"}/{l.bathrooms ?? "—"}</td>
                            <td style={{color:"var(--sub)"}}>{l.squareFootage ? l.squareFootage.toLocaleString() : "—"}</td>
                            <td style={{fontWeight:700,color:"var(--blue)"}}>{l.price ? fmt(l.price) : "—"}</td>
                            <td style={{color:"var(--sub)"}}>{l.psf ? fmt(l.psf) : "—"}</td>
                            <td>
                              <span style={{
                                fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                                background: (l.daysOnMarket || 0) < 14 ? "rgba(52,217,138,0.12)" : (l.daysOnMarket || 0) < 45 ? "rgba(240,160,48,0.12)" : "rgba(242,92,92,0.12)",
                                color:      (l.daysOnMarket || 0) < 14 ? "var(--green)" : (l.daysOnMarket || 0) < 45 ? "var(--amber)" : "var(--red)",
                              }}>
                                {l.daysOnMarket != null ? `${l.daysOnMarket}d` : "—"}
                              </span>
                            </td>
                            <td style={{color:"var(--dim)",fontSize:11}}>{l.propertyType || "—"}</td>
                            <td><ListingSiteLinks address={l.address} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Rental Comps Table ───────────────────────────────────── */}
              {(rentCompsList.length > 0 || activeRentals.length > 0) && (
                <div className="ph-comps-section">
                  <div className="ph-comps-head">
                    <div className="ph-comps-title">
                      🏠 Rental Comps — Active Listings
                      <span className="ph-comps-badge">{activeRentals.length + rentCompsList.length} comps</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>Current market rents within 0.5mi</div>
                  </div>
                  <div className="ph-comps-wrap">
                    <table className="ph-comps-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Bed/Ba</th>
                          <th>Sqft</th>
                          <th>Monthly Rent</th>
                          <th>Rent/sqft</th>
                          <th>Listed / Age</th>
                          <th>Type</th>
                          <th>Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...activeRentals, ...rentCompsList].map((r, i) => (
                          <tr key={i}>
                            <td><div className="ph-comp-addr" title={r.address}>{shortAddr(r.address)}</div></td>
                            <td style={{color:"var(--sub)"}}>{r.bedrooms ?? "—"}/{r.bathrooms ?? "—"}</td>
                            <td style={{color:"var(--sub)"}}>{r.squareFootage ? r.squareFootage.toLocaleString() : "—"}</td>
                            <td style={{fontWeight:700,color:"var(--green)"}}>{r.rent ? `${fmt(r.rent)}/mo` : "—"}</td>
                            <td style={{color:"var(--sub)"}}>{r.rentPsf ? `$${r.rentPsf}/sqft` : "—"}</td>
                            <td style={{color:"var(--sub)",fontSize:11}}>
                              {r.daysOnMarket != null ? `${r.daysOnMarket}d listed` : r.daysOld != null ? daysAgo(r.daysOld) : "—"}
                            </td>
                            <td style={{color:"var(--dim)",fontSize:11}}>{r.propertyType || "Residential"}</td>
                            <td><ListingSiteLinks address={r.address} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="ph-section-divider" />
            </>
          )}

          {/* ── CANADIAN COMPS (Realtor.ca) ─────────────────────────────── */}
          {caComps && (
            <>
              <div className="ph-section-divider" />
              <div style={{fontSize:13,fontWeight:800,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                🍁 Realtor.ca Market Data
                <a href={caComps.searchUrl} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:11,fontWeight:600,color:"var(--purple)",background:"rgba(167,130,255,0.1)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:99,padding:"2px 10px",textDecoration:"none"}}>
                  View on Realtor.ca →
                </a>
              </div>

              {/* Degraded-source banner — surfaces when Realtor.ca's bot
                  detection blocks the scrape. Better to tell users the truth
                  than fake "0 listings found." Cleared when Repliers is wired. */}
              {caComps.degraded && (
                <div style={{
                  background:"rgba(212,175,55,0.06)",
                  border:"1px solid rgba(212,175,55,0.28)",
                  borderLeft:"3px solid #d4af37",
                  borderRadius: 8,
                  padding:"14px 16px",
                  marginBottom:16,
                  fontSize:13,
                  color:"var(--text)",
                  lineHeight:1.55,
                }}>
                  <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.3px",color:"#b8941f",textTransform:"uppercase",marginBottom:6}}>
                    ⚠ Live MLS comps degraded
                  </div>
                  Realtor.ca is currently blocking automated lookups for this address.
                  Sale and rental comps are temporarily unavailable for this listing.
                  Other data (zoning, CMHC rent anchor, assessed values, AI Building Grade)
                  is still flowing — see the cards above. Full MLS access returns when
                  Repliers integration is enabled.
                </div>
              )}

              {/* CMHC Rental Market Data */}
              {caComps.cmhcData && (
                <div style={{background:"rgba(52,217,138,0.04)",border:"1px solid rgba(52,217,138,0.15)",borderRadius: 16,padding:"16px 20px",marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--green)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>
                    🏠 CMHC Rental Market — {caComps.cmhcData.city}, {caComps.cmhcData.province} ({caComps.cmhcData.dataYear})
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:10}}>
                    {[
                      { label:"Bachelor",  val:caComps.cmhcData.avgRents?.bachelor },
                      { label:"1 Bedroom", val:caComps.cmhcData.avgRents?.oneBed },
                      { label:"2 Bedroom", val:caComps.cmhcData.avgRents?.twoBed },
                      { label:"3+ Bedroom",val:caComps.cmhcData.avgRents?.threePlusBed },
                    ].filter(r=>r.val).map(r=>(
                      <div key={r.label} style={{background:"var(--card2)",borderRadius: 10,padding:"10px 12px",border:"1px solid var(--borderf)"}}>
                        <div style={{fontSize:16,fontWeight:800,color:"var(--green)"}}>{fmtCad(r.val)}<span style={{fontSize:11,color:"var(--sub)",fontWeight:500}}>/mo</span></div>
                        <div style={{fontSize:10,color:"var(--dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:2}}>{r.label}</div>
                      </div>
                    ))}
                    {caComps.cmhcData.vacancyRate != null && (
                      <div style={{background:"var(--card2)",borderRadius: 10,padding:"10px 12px",border:"1px solid var(--borderf)"}}>
                        <div style={{fontSize:16,fontWeight:800,color:caComps.cmhcData.vacancyRate<2?"var(--red)":caComps.cmhcData.vacancyRate<4?"var(--amber)":"var(--green)"}}>
                          {caComps.cmhcData.vacancyRate}%
                        </div>
                        <div style={{fontSize:10,color:"var(--dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginTop:2}}>Vacancy Rate</div>
                      </div>
                    )}
                  </div>
                  {caComps.cmhcData.notes && (
                    <div style={{fontSize:11,color:"var(--sub)",fontStyle:"italic"}}>{caComps.cmhcData.notes}</div>
                  )}
                  <div style={{fontSize:10,color:"var(--dim)",marginTop:6}}>Source: CMHC Rental Market Survey · Annual data · cmhc-schl.gc.ca</div>
                </div>
              )}

              {/* CA Market Snapshot */}
              {caComps.stats && (
                <div className="ph-market-snap" style={{marginBottom:20}}>
                  <div className="ph-snap-card">
                    <div className="ph-snap-label">Median List Price</div>
                    <div className="ph-snap-val" style={{color:"var(--purple)"}}>{caComps.stats.medianActivePrice ? fmtCad(caComps.stats.medianActivePrice) : "—"}</div>
                    <div className="ph-snap-sub">{caComps.stats.activeCount || 0} active listings</div>
                  </div>
                  <div className="ph-snap-card">
                    <div className="ph-snap-label">Total Area Listings</div>
                    <div className="ph-snap-val">{caComps.stats.totalActiveArea ?? "—"}</div>
                    <div className="ph-snap-sub">~1.5km radius</div>
                  </div>
                  <div className="ph-snap-card">
                    <div className="ph-snap-label">Avg Days Listed</div>
                    <div className="ph-snap-val" style={{color:"var(--amber)"}}>{caComps.stats.avgDaysOnMarket ?? "—"}</div>
                    <div className="ph-snap-sub">days on market</div>
                  </div>
                  {caComps.stats.medianSoldPrice ? (
                    <div className="ph-snap-card">
                      <div className="ph-snap-label">Median Sold Price</div>
                      <div className="ph-snap-val" style={{color:"var(--green)"}}>{fmtCad(caComps.stats.medianSoldPrice)}</div>
                      <div className="ph-snap-sub">{caComps.stats.soldCount} recent sales</div>
                    </div>
                  ) : (
                    <div className="ph-snap-card">
                      <div className="ph-snap-label">Sold Data</div>
                      <div className="ph-snap-val" style={{fontSize:13,color:"var(--dim)"}}>MLS Only</div>
                      <div className="ph-snap-sub">Contact agent for sold comps</div>
                    </div>
                  )}
                </div>
              )}

              {/* CA Active Listings Table */}
              {(caComps.activeListings || []).length > 0 && (
                <div className="ph-comps-section">
                  <div className="ph-comps-head">
                    <div className="ph-comps-title">
                      🏠 Active Listings — Realtor.ca
                      <span className="ph-comps-badge">{caComps.activeListings.length} listings</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>Live MLS listings within ~1.5km</div>
                  </div>
                  <div className="ph-comps-wrap">
                    <table className="ph-comps-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Bed/Ba</th>
                          <th>Sqft</th>
                          <th>List Price (CAD)</th>
                          <th>Days Listed</th>
                          <th>Type</th>
                          <th>MLS #</th>
                          <th>View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caComps.activeListings.map((l, i) => (
                          <tr key={i}>
                            <td>
                              <div className="ph-comp-addr" title={`${l.address} ${l.cityProvince}`}>
                                {l.address || "—"}
                              </div>
                              {l.cityProvince && <div style={{fontSize:10,color:"var(--dim)"}}>{l.cityProvince}</div>}
                            </td>
                            <td style={{color:"var(--sub)"}}>{l.bedrooms ?? "—"}/{l.bathrooms ?? "—"}</td>
                            <td style={{color:"var(--sub)"}}>{l.sqft ? l.sqft.toLocaleString() : "—"}</td>
                            <td style={{fontWeight:700,color:"var(--purple)"}}>{l.price ? fmtCad(l.price) : "—"}</td>
                            <td>
                              {l.daysOnMarket != null ? (
                                <span style={{
                                  fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,
                                  background: l.daysOnMarket < 14 ? "rgba(52,217,138,0.12)" : l.daysOnMarket < 45 ? "rgba(240,160,48,0.12)" : "rgba(242,92,92,0.12)",
                                  color:      l.daysOnMarket < 14 ? "var(--green)"           : l.daysOnMarket < 45 ? "var(--amber)"           : "var(--red)",
                                }}>
                                  {l.daysOnMarket}d
                                </span>
                              ) : "—"}
                            </td>
                            <td style={{color:"var(--dim)",fontSize:11}}>{l.propertyType || "—"}</td>
                            <td style={{color:"var(--sub)",fontSize:11}}>{l.mlsNumber || "—"}</td>
                            <td>
                              {l.listingUrl ? (
                                <a href={l.listingUrl} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:700,textDecoration:"none",background:"rgba(167,130,255,0.15)",color:"var(--purple)",whiteSpace:"nowrap"}}>
                                  View →
                                </a>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CA Sold Listings (if available) */}
              {(caComps.soldListings || []).length > 0 && (
                <div className="ph-comps-section">
                  <div className="ph-comps-head">
                    <div className="ph-comps-title">
                      📋 Sold Listings — Realtor.ca
                      <span className="ph-comps-badge">{caComps.soldListings.length}</span>
                    </div>
                  </div>
                  <div className="ph-comps-wrap">
                    <table className="ph-comps-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Bed/Ba</th>
                          <th>Sqft</th>
                          <th>Sold Price (CAD)</th>
                          <th>Type</th>
                          <th>MLS #</th>
                          <th>View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caComps.soldListings.map((l, i) => (
                          <tr key={i}>
                            <td>
                              <div className="ph-comp-addr" title={l.address}>{l.address || "—"}</div>
                              {l.cityProvince && <div style={{fontSize:10,color:"var(--dim)"}}>{l.cityProvince}</div>}
                            </td>
                            <td style={{color:"var(--sub)"}}>{l.bedrooms ?? "—"}/{l.bathrooms ?? "—"}</td>
                            <td style={{color:"var(--sub)"}}>{l.sqft ? l.sqft.toLocaleString() : "—"}</td>
                            <td style={{fontWeight:700,color:"var(--green)"}}>{l.price ? fmtCad(l.price) : "—"}</td>
                            <td style={{color:"var(--dim)",fontSize:11}}>{l.propertyType || "—"}</td>
                            <td style={{color:"var(--sub)",fontSize:11}}>{l.mlsNumber || "—"}</td>
                            <td>
                              {l.listingUrl ? (
                                <a href={l.listingUrl} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:700,textDecoration:"none",background:"rgba(52,217,138,0.12)",color:"var(--green)",whiteSpace:"nowrap"}}>
                                  View →
                                </a>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="ph-section-divider" style={{marginBottom:16}} />
            </>
          )}

          {/* ── PROPERTY-FIT BUDDY PANEL ── Smart recommendation based on
              what we know about the property: zoning, year built, assessed
              value, units. Names the best-fit strategy, surfaces the city's
              key benchmarks, and gives an "open in calculator" CTA. */}
          {hasData && (() => {
            const citySlugLocal = detectCitySlug(property?.address || query);
            const yr = property?.yearBuilt;
            const av = property?.estimatedValue || property?.assessedValue;
            const units = property?.unitCount || (caComps?.stats?.units);
            const z = (property?.zoning?.code || property?.zoning || "").toString().toUpperCase();
            // Best-fit strategy logic — multi-unit first, then flip if old + cheap, BRRRR default.
            let fit = "brrrr", fitName = "BRRRR", fitWhy = "Default starting point for an income property.";
            if (units && units >= 4) { fit = "multifamily"; fitName = "Multifamily Underwriter"; fitWhy = `${units}-unit building — institutional underwrite needed.`; }
            else if (/RM|R-CG|R3|CR|MD|TOC/.test(z)) { fit = "multifamily"; fitName = "Multifamily Underwriter"; fitWhy = `Zoning code ${z} allows multi-unit — model the upside.`; }
            else if (yr && yr < 1980 && av && av < 600000) { fit = "flip"; fitName = "Fix & Flip Analyzer"; fitWhy = "Older building, sub-$600K assessed — flip candidate."; }
            const bench = getCapRateBenchmark(citySlugLocal, fit === "flip" ? "flip" : "multifamily");
            const dscrT = getDscrThresholds();
            const fitStrategyObj = STRATEGIES.find(s => s.id === fit) || STRATEGIES[0];
            return (
              <div style={{
                margin:"12px 0 22px",
                padding:"18px 20px",
                background:"linear-gradient(180deg,rgba(212,175,55,0.05),rgba(0,12,31,0.02))",
                border:"1px solid rgba(212,175,55,0.28)",
                borderLeft:"3px solid var(--gold,#d4af37)",
                borderRadius:8,
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:10}}>
                  <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,letterSpacing:"1.4px",color:"#d4af37",textTransform:"uppercase"}}>
                    ▸ Buddy Read
                  </div>
                  {citySlugLocal !== "default" && (
                    <span style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10,color:"var(--dim)",letterSpacing:"0.4px",textTransform:"uppercase"}}>
                      {citySlugLocal} benchmarks loaded
                    </span>
                  )}
                </div>
                <div style={{fontSize:15,color:"var(--text)",lineHeight:1.55,marginBottom:14}}>
                  Best fit looks like <strong style={{color:"#d4af37"}}>{fitName}</strong>. {fitWhy}
                  {bench && bench.target > 0 && citySlugLocal !== "default" && (
                    <> Expect cap rates in the <strong>{(bench.low*100).toFixed(1)}-{(bench.high*100).toFixed(1)}%</strong> range, DSCR floor <strong>{dscrT.lenderFloor.toFixed(2)}</strong> for lender approval.</>
                  )}
                </div>
                <button
                  onClick={() => goToStrategy(fitStrategyObj)}
                  style={{
                    background:"#d4af37",color:"#0a1128",border:"none",borderRadius:5,
                    padding:"10px 18px",fontFamily:"'Geist Mono',ui-monospace,monospace",
                    fontSize:11.5,fontWeight:800,letterSpacing:"0.5px",cursor:"pointer",
                    textTransform:"uppercase",display:"inline-flex",alignItems:"center",gap:8,
                  }}
                >
                  ▸ Open {fitName} with this address →
                </button>
              </div>
            );
          })()}

          {/* Strategy picker */}
          <div className="ph-strategy-title">
            {hasData || hasComps || hasCaComps
              ? "Pick your strategy — all numbers pre-fill automatically:"
              : "Pick your analysis strategy:"}
          </div>
          <div className="ph-strategies" data-tour="hub-cards">
            {STRATEGIES.map(s => (
              <button key={s.id} className={`ph-strat ${s.cls}`} onClick={() => goToStrategy(s)}>
                <span className="ph-strat-icon">{s.icon}</span>
                <div className="ph-strat-name">{s.name}</div>
                <div className="ph-strat-desc">{s.desc}</div>
                <div className="ph-strat-pills">
                  {s.pills.map(p => <span key={p} className="ph-strat-pill">{p}</span>)}
                </div>
                <div className="ph-strat-cta">{s.cta}</div>
              </button>
            ))}
          </div>

        </div>
      )}

      {/* Before search — show strategy cards */}
      {!loading && !property && (
        <div className="ph-blank-strategies" data-tour="hub-cards" style={{marginTop:24}}>
          {STRATEGIES.map(s => (
            <button key={s.id} className={`ph-strat ${s.cls}`} onClick={() => navigate(s.route)}>
              <span className="ph-strat-icon">{s.icon}</span>
              <div className="ph-strat-name">{s.name}</div>
              <div className="ph-strat-desc">{s.desc}</div>
              <div className="ph-strat-pills">
                {s.pills.map(p => <span key={p} className="ph-strat-pill">{p}</span>)}
              </div>
              <div className="ph-strat-cta">Go to {s.name.split(" ")[0]} →</div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

/**
 * OverallVerdictBanner — the "one-answer" synthesis that shows before any
 * detail cards. Pitch-critical: this is what a broker or investor wants
 * BEFORE they scroll into 15 tables of numbers.
 *
 * Verdict logic (heuristic, guaranteed to compute from what's available):
 *   1. Try Building Grade overall (A→STRONG, B→GO, C→CAUTION, D/F→PASS)
 *   2. Best strategy inferred from zoning code + property size
 *   3. Max offer = estimatedValue × (1 − 5% negotiation buffer)
 *   4. Confidence: HIGH if grade + zoning + AVM all present, MED if 2/3, LOW otherwise
 */
function OverallVerdictBanner({ property, cityData, buildingGrade }) {
  const gradeMap = { A: "STRONG", B: "GO", C: "CAUTION", D: "PASS", F: "PASS" };
  const gradeLetter = (buildingGrade?.overall || "").toUpperCase().charAt(0);
  const verdict = gradeMap[gradeLetter] || (buildingGrade?.overall ? "GO" : "PENDING");

  const verdictStyle = {
    STRONG:  { color: "#16a34a", bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.42)"  },
    GO:      { color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.42)"  },
    CAUTION: { color: "#eab308", bg: "rgba(234,179,8,0.10)",  border: "rgba(234,179,8,0.42)"  },
    PASS:    { color: "#dc2626", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.42)"  },
    PENDING: { color: "#94a3b8", bg: "rgba(148,163,184,0.10)",border: "rgba(148,163,184,0.42)"},
  }[verdict];

  const zoningCode = (property?.zoning?.code || property?.zoning || cityData?.zoning || "").toString().toUpperCase();
  const lotSqft = Number(property?.lotSize || cityData?.lotSizeSqft || 0);

  let bestStrategy = "Buy & Hold";
  let strategyReason = "Default residential hold";

  if (/RCG|R-CG|RG|RD|R-D|MULTIPLEX/i.test(zoningCode) && lotSqft >= 3000) {
    bestStrategy = "Multiplex Build";
    strategyReason = `${zoningCode} lot supports as-of-right density`;
  } else if (/RS|R-S|RM|R1|R2/i.test(zoningCode) && lotSqft >= 5000) {
    bestStrategy = "Multiplex Build";
    strategyReason = `${zoningCode} lot supports multiplex under 2024 bylaws`;
  } else if (property?.assessedValue && property?.estimatedValue && property.assessedValue < property.estimatedValue * 0.75) {
    bestStrategy = "BRRRR";
    strategyReason = "Assessed value gap suggests value-add path";
  } else if (property?.estimatedValue && property?.estimatedValueHigh && (property.estimatedValueHigh - property.estimatedValue) / property.estimatedValue > 0.10) {
    bestStrategy = "Fix & Flip";
    strategyReason = "AVM range suggests renovation upside";
  }

  const val = property?.estimatedValue || property?.assessedValue || 0;
  const maxOffer = val ? Math.round(val * 0.95 / 1000) * 1000 : null;

  let confidence = "LOW";
  const signals = [!!buildingGrade?.overall, !!zoningCode, !!val].filter(Boolean).length;
  if (signals === 3) confidence = "HIGH";
  else if (signals === 2) confidence = "MEDIUM";

  const isCanadian = property?.currency === "CAD" || /[A-Z]\d[A-Z]/.test(property?.address || "");
  const fmtLocal = n => new Intl.NumberFormat(isCanadian ? "en-CA" : "en-US", {
    style: "currency", currency: isCanadian ? "CAD" : "USD", maximumFractionDigits: 0,
  }).format(n || 0);

  return (
    <div style={{
      margin: "20px 0 8px",
      padding: "22px 26px",
      background: `linear-gradient(135deg, ${verdictStyle.bg}, rgba(212,175,55,0.03))`,
      border: `1px solid ${verdictStyle.border}`,
      borderLeft: `4px solid ${verdictStyle.color}`,
      borderRadius: 12,
      boxShadow: "0 12px 40px -8px rgba(0,0,0,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{
          padding: "10px 20px",
          background: verdictStyle.color,
          color: "#fff",
          borderRadius: 6,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 2,
          textAlign: "center",
          minWidth: 140,
          boxShadow: `0 4px 14px -2px ${verdictStyle.color}55`,
        }}>
          {verdict}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 1.4,
            color: "#d4af37",
            textTransform: "uppercase",
            marginBottom: 4,
          }}>
            ▸ OVERALL VERDICT · {confidence} CONFIDENCE
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: -0.4, lineHeight: 1.3 }}>
            {verdict === "STRONG" && "Move on this deal."}
            {verdict === "GO"      && "Worth a serious look."}
            {verdict === "CAUTION" && "Numbers work only under specific conditions."}
            {verdict === "PASS"    && "Not a fit at current pricing."}
            {verdict === "PENDING" && "Loading full verdict…"}
          </div>
          {buildingGrade?.summary && (
            <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.55, marginTop: 6, fontStyle: "italic" }}>
              {buildingGrade.summary}
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 8,
      }}>
        <VerdictCell label="Best strategy" value={bestStrategy} note={strategyReason} color="#d4af37" />
        <VerdictCell
          label="Max offer"
          value={maxOffer ? fmtLocal(maxOffer) : "—"}
          note={val ? `5% under ${fmtLocal(val)} AVM` : "AVM not available"}
          color="#2155cd"
        />
        <VerdictCell
          label="Zoning"
          value={zoningCode || "—"}
          note={cityData?.zoning_desc || (isCanadian ? "Canadian residential" : "Residential")}
          color="#16a34a"
        />
      </div>

      <div style={{
        marginTop: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: "'Geist Mono', monospace",
        fontSize: 11,
        color: "var(--sub)",
        letterSpacing: 0.3,
      }}>
        <span>
          Signals: {buildingGrade?.overall ? "✓ Grade" : "○ Grade"} ·{" "}
          {zoningCode ? "✓ Zoning" : "○ Zoning"} ·{" "}
          {val ? "✓ AVM" : "○ AVM"} ·{" "}
          {cityData?.permits?.length ? `✓ ${cityData.permits.length} permits` : "○ Permits"}
        </span>
        <a
          href="#deep-analysis"
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector("#deep-analysis") || document.querySelector(".ph-results > div:nth-child(4)");
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          style={{
            color: verdictStyle.color,
            fontWeight: 800,
            textDecoration: "none",
            padding: "5px 10px",
            border: `1px solid ${verdictStyle.border}`,
            borderRadius: 4,
            fontSize: 11,
            letterSpacing: 0.5,
          }}
        >
          See full analysis ↓
        </a>
      </div>
    </div>
  );
}

function VerdictCell({ label, value, note, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: 9.5,
        fontWeight: 800,
        color: "var(--sub)",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 800,
        color,
        letterSpacing: -0.3,
        lineHeight: 1.2,
        marginBottom: 2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: 10.5,
        color: "var(--sub)",
        letterSpacing: 0.2,
        lineHeight: 1.4,
      }}>
        {note}
      </div>
    </div>
  );
}
