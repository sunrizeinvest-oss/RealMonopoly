import { useState, useMemo } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

// ─── Market benchmarks by location type ──────────────────────────────────────
// Price per sqft ranges and rent per bed by market tier
const MARKETS = {
  "Major Metro (NYC, LA, SF, Miami, Seattle)":     { psfLow: 450, psfMid: 700, psfHigh: 1100, rentPerBed: 1400, capRate: 0.04, name: "Major Metro" },
  "Large City (Chicago, Dallas, Denver, Phoenix)":  { psfLow: 220, psfMid: 320, psfHigh: 480,  rentPerBed: 1050, capRate: 0.055, name: "Large City" },
  "Mid-Size City (Austin, Nashville, Charlotte)":   { psfLow: 200, psfMid: 290, psfHigh: 420,  rentPerBed: 1000, capRate: 0.06, name: "Mid-Size City" },
  "Suburban Market":                                { psfLow: 160, psfMid: 240, psfHigh: 360,  rentPerBed: 850,  capRate: 0.065, name: "Suburban" },
  "Small City / Rural":                             { psfLow: 90,  psfMid: 150, psfHigh: 240,  rentPerBed: 650,  capRate: 0.08, name: "Small City / Rural" },
  "Canadian Major (Toronto, Vancouver)":            { psfLow: 500, psfMid: 750, psfHigh: 1200, rentPerBed: 1600, capRate: 0.035, name: "Canadian Major" },
  "Canadian City (Calgary, Edmonton, Ottawa)":      { psfLow: 280, psfMid: 380, psfHigh: 520,  rentPerBed: 1100, capRate: 0.05, name: "Canadian City" },
};

const CONDITIONS = {
  "Excellent — fully updated, move-in ready":  1.15,
  "Good — minor updates, well maintained":     1.00,
  "Average — dated but functional":            0.88,
  "Fair — needs cosmetic work":                0.76,
  "Poor — major renovation needed":            0.62,
};

const PROP_TYPES = {
  "Single Family Home":   { rentMult: 1.0,  valueAdj: 1.00 },
  "Townhouse / Row Home": { rentMult: 0.92, valueAdj: 0.92 },
  "Condo / Apartment":    { rentMult: 0.85, valueAdj: 0.85 },
  "Duplex (2-unit)":      { rentMult: 1.8,  valueAdj: 1.75 },
  "Triplex (3-unit)":     { rentMult: 2.6,  valueAdj: 2.5  },
  "Fourplex (4-unit)":    { rentMult: 3.3,  valueAdj: 3.2  },
};

const fmt  = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => `${(n * 100).toFixed(1)}%`;
const num  = v => parseFloat(v) || 0;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'DM Sans',sans-serif;font-size:16px!important}

  .pw-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .pw-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .pw-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.pw-logo span{color:var(--blue)}
  .pw-nav-right{display:flex;align-items:center;gap:8px}
  .pw-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px}.pw-nav-link:hover{color:var(--text)}
  .pw-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none}

  /* Hero */
  .pw-hero{text-align:center;padding:60px 24px 40px;position:relative;overflow:hidden}
  .pw-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.025) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .pw-glow{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(59,158,255,0.08) 0%,transparent 65%);pointer-events:none}
  .pw-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:3px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--green);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .pw-hero h1{font-size:clamp(28px,5vw,52px);font-weight:800;letter-spacing:-2px;color:var(--text);line-height:1.08;margin-bottom:12px;position:relative;z-index:1}
  .pw-hero h1 span{color:var(--blue)}
  .pw-hero p{font-size:16px;color:var(--sub);max-width:500px;margin:0 auto;line-height:1.65;position:relative;z-index:1}

  /* Body layout */
  .pw-body{max-width:1060px;margin:0 auto;padding:0 20px 80px;display:grid;grid-template-columns:440px 1fr;gap:28px;align-items:start}
  @media(max-width:860px){.pw-body{grid-template-columns:1fr}}

  /* Card */
  .pw-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-bottom:16px}
  .pw-card-header{padding:14px 20px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;gap:10px}
  .pw-card-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
  .pw-card-title{font-size:13.5px;font-weight:700;color:var(--text)}
  .pw-card-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px}

  /* Fields */
  .pw-field{display:flex;flex-direction:column;gap:5px}
  .pw-label{font-size:11.5px;font-weight:700;color:var(--sub)}
  .pw-label-hint{font-size:10.5px;color:var(--dim);margin-top:1px}
  .pw-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:10px 13px;color:var(--text);outline:none;transition:border-color 0.15s}
  .pw-input:focus{border-color:rgba(59,158,255,0.4);box-shadow:0 0 0 3px rgba(59,158,255,0.07)}
  .pw-select{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:10px 13px;color:var(--text);outline:none;appearance:none;cursor:pointer;transition:border-color 0.15s}
  .pw-select:focus{border-color:rgba(59,158,255,0.4)}
  .pw-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .pw-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}

  /* Results */
  .pw-results-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden;position:sticky;top:72px}
  .pw-results-header{padding:18px 22px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;justify-content:space-between}
  .pw-results-title{font-size:15px;font-weight:800;color:var(--text)}
  .pw-results-sub{font-size:12px;color:var(--sub);margin-top:2px}
  .pw-results-body{padding:20px 22px}

  /* Value range */
  .pw-value-range{background:linear-gradient(135deg,rgba(59,158,255,0.08),rgba(52,217,138,0.05));border:1px solid rgba(59,158,255,0.2);border-radius:6px;padding:20px;margin-bottom:20px;text-align:center}
  .pw-range-label{font-size:10.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
  .pw-range-main{font-size:36px;font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
  .pw-range-low-high{font-size:13px;color:var(--sub);display:flex;align-items:center;justify-content:center;gap:8px}
  .pw-range-arrow{color:var(--dim)}
  .pw-range-psf{font-size:11px;color:var(--dim);margin-top:6px}

  /* Metric row */
  .pw-metric-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
  .pw-metric-row:last-child{border-bottom:none}
  .pw-metric-name{font-size:13px;color:var(--sub)}
  .pw-metric-val{font-family:'Fira Code',ui-monospace,monospace;font-size:14px;font-weight:700;color:var(--text)}

  /* Rent card */
  .pw-rent-block{background:rgba(52,217,138,0.06);border:1px solid rgba(52,217,138,0.18);border-radius:6px;padding:16px;margin-bottom:16px}
  .pw-rent-label{font-size:10.5px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px}
  .pw-rent-val{font-size:28px;font-weight:800;color:var(--text);letter-spacing:-1px;line-height:1;margin-bottom:3px}
  .pw-rent-sub{font-size:12px;color:var(--sub)}

  /* Cashflow verdict */
  .pw-verdict{border-radius:6px;padding:14px 16px;margin-bottom:16px}
  .pw-verdict-title{font-size:14px;font-weight:800;margin-bottom:4px}
  .pw-verdict-sub{font-size:12px;line-height:1.5}

  /* Strategy buttons */
  .pw-strategy-btns{display:flex;flex-direction:column;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--borderf)}
  .pw-strategy-label{font-size:10.5px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
  .pw-strat-btn{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:6px;border:1px solid var(--borderf);background:rgba(255,255,255,0.03);cursor:pointer;transition:all 0.15s;font-family:'DM Sans',sans-serif;text-decoration:none;width:100%}
  .pw-strat-btn:hover{border-color:rgba(59,158,255,0.3);background:rgba(59,158,255,0.06)}
  .pw-strat-icon{font-size:18px;flex-shrink:0}
  .pw-strat-text{text-align:left}
  .pw-strat-name{font-size:13px;font-weight:700;color:var(--text)}
  .pw-strat-desc{font-size:11px;color:var(--sub);margin-top:1px}

  /* Empty state */
  .pw-empty{text-align:center;padding:48px 24px;color:var(--sub)}
  .pw-empty-icon{font-size:48px;margin-bottom:16px}
  .pw-empty-title{font-size:16px;font-weight:700;color:var(--sub);margin-bottom:8px}
  .pw-empty-sub{font-size:13px;color:var(--dim);line-height:1.65}

  /* Disclaimer */
  .pw-disclaimer{background:rgba(240,160,48,0.06);border:1px solid rgba(240,160,48,0.15);border-radius:6px;padding:12px 14px;font-size:11.5px;color:var(--sub);line-height:1.65;margin-top:16px}
  .pw-disclaimer strong{color:var(--amber)}
`;

export default function PropertyWorth() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [address,       setAddress]       = useState("");
  const [market,        setMarket]        = useState("");
  const [propType,      setPropType]      = useState("Single Family Home");
  const [condition,     setCondition]     = useState("Good — minor updates, well maintained");
  const [beds,          setBeds]          = useState("3");
  const [baths,         setBaths]         = useState("2");
  const [sqft,          setSqft]          = useState("");
  const [yearBuilt,     setYearBuilt]     = useState("");
  const [askPrice,      setAskPrice]      = useState("");
  const [mortgage,      setMortgage]      = useState("75");
  const [rate,          setRate]          = useState("7.0");
  const [submitted,     setSubmitted]     = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFilled,  setLookupFilled]  = useState(false);
  const [lookupError,   setLookupError]   = useState("");

  // ── Address auto-fill ────────────────────────────────────────────────────
  async function lookupAddress() {
    const q = address.trim();
    if (!q) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupFilled(false);
    try {
      const res  = await fetch(`/api/property-lookup?address=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");

      // Map beds
      if (data.bedrooms) {
        const b = Math.min(6, Math.max(1, Math.round(data.bedrooms)));
        setBeds(String(b));
      }
      // Map baths — snap to nearest valid option
      if (data.bathrooms) {
        const validBaths = [1, 1.5, 2, 2.5, 3, 3.5, 4];
        const snap = validBaths.reduce((prev, cur) =>
          Math.abs(cur - data.bathrooms) < Math.abs(prev - data.bathrooms) ? cur : prev
        );
        setBaths(String(snap));
      }
      // Sqft, year built, asking price
      if (data.squareFootage) setSqft(String(data.squareFootage));
      if (data.yearBuilt)     setYearBuilt(String(data.yearBuilt));
      if (data.lastSalePrice) setAskPrice(String(Math.round(data.lastSalePrice)));

      // Map property type
      const pt = data.propertyType || "";
      if (/condo|apartment|flat/i.test(pt))       setPropType("Condo / Apartment");
      else if (/town|row/i.test(pt))              setPropType("Townhouse / Row Home");
      else if (/duplex|2.unit/i.test(pt))         setPropType("Duplex (2-unit)");
      else if (/triplex|3.unit/i.test(pt))        setPropType("Triplex (3-unit)");
      else if (/four|quad|4.unit/i.test(pt))      setPropType("Fourplex (4-unit)");
      else                                         setPropType("Single Family Home");

      // Detect market from address/county
      const addr = (data.address || q).toLowerCase();
      const city = (data.county || "").toLowerCase();
      if (/toronto|vancouver/i.test(addr))
        setMarket("Canadian Major (Toronto, Vancouver)");
      else if (/calgary|edmonton|ottawa|montreal|winnipeg|victoria|kelowna/i.test(addr))
        setMarket("Canadian City (Calgary, Edmonton, Ottawa)");
      else if (/new york|los angeles|san francisco|miami|seattle|boston/i.test(addr))
        setMarket("Major Metro (NYC, LA, SF, Miami, Seattle)");
      else if (/chicago|dallas|denver|phoenix|atlanta|houston|las vegas|minneapolis/i.test(addr))
        setMarket("Large City (Chicago, Dallas, Denver, Phoenix)");
      else if (/austin|nashville|charlotte|tampa|raleigh|salt lake|portland|richmond|san antonio/i.test(addr))
        setMarket("Mid-Size City (Austin, Nashville, Charlotte)");
      else if (market === "")
        setMarket("Suburban Market");

      setLookupFilled(true);
      setTimeout(() => setLookupFilled(false), 4000);
    } catch (e) {
      setLookupError(e.message || "Lookup failed — check address or add API key");
    }
    setLookupLoading(false);
  }

  function handleAddressKey(e) {
    if (e.key === "Enter") lookupAddress();
  }

  const estimate = useMemo(() => {
    if (!market || !sqft || num(sqft) < 100) return null;

    const m   = MARKETS[market];
    const pt  = PROP_TYPES[propType] || PROP_TYPES["Single Family Home"];
    const cond = CONDITIONS[condition] || 1.0;
    const s   = num(sqft);
    const b   = num(beds) || 3;
    const yr  = num(yearBuilt);
    const ageAdj = yr > 0 ? Math.max(0.80, 1 - ((2025 - yr) * 0.003)) : 0.92;

    // Value estimate
    const psfMid  = m.psfMid  * cond * pt.valueAdj * ageAdj;
    const psfLow  = m.psfLow  * cond * pt.valueAdj * ageAdj;
    const psfHigh = m.psfHigh * cond * pt.valueAdj * ageAdj;
    const valMid  = psfMid  * s;
    const valLow  = psfLow  * s;
    const valHigh = psfHigh * s;

    // Rent estimate
    const monthlyRent = m.rentPerBed * b * pt.rentMult * cond * Math.min(1, (ageAdj + 0.05));
    const annualRent  = monthlyRent * 12;
    const vacancyRate = 0.07;
    const egi         = annualRent * (1 - vacancyRate);
    const opexPct     = 0.38; // ~38% of EGI for typical expenses
    const noi         = egi * (1 - opexPct);
    const capRate     = valMid > 0 ? noi / valMid : 0;
    const grm         = monthlyRent > 0 ? valMid / annualRent : 0;

    // Mortgage / cash flow (if purchase price given)
    const purchasePrice = num(askPrice) || valMid;
    const ltvPct        = num(mortgage) / 100;
    const loanAmt       = purchasePrice * ltvPct;
    const downPay       = purchasePrice * (1 - ltvPct);
    const rateMonthly   = num(rate) / 100 / 12;
    const n             = 30 * 12;
    const payment       = loanAmt > 0 && rateMonthly > 0
      ? loanAmt * (rateMonthly * Math.pow(1 + rateMonthly, n)) / (Math.pow(1 + rateMonthly, n) - 1)
      : 0;
    const annualDebtService = payment * 12;
    const cashFlow      = noi - annualDebtService;
    const monthlyCF     = cashFlow / 12;
    const coc           = downPay > 0 ? cashFlow / downPay : 0;
    const dscr          = annualDebtService > 0 ? noi / annualDebtService : 0;

    // Value vs ask
    const askDiff  = num(askPrice) > 0 ? valMid - num(askPrice) : null;
    const askPct   = num(askPrice) > 0 ? (valMid - num(askPrice)) / num(askPrice) : null;

    return {
      valMid, valLow, valHigh, psfMid,
      monthlyRent, annualRent, egi, noi, capRate, grm,
      payment, annualDebtService, cashFlow, monthlyCF, coc, dscr,
      downPay, loanAmt, purchasePrice,
      askDiff, askPct,
    };
  }, [market, propType, condition, beds, baths, sqft, yearBuilt, askPrice, mortgage, rate]);

  function goToStrategy(route) {
    if (estimate) {
      localStorage.setItem("rde_prefill", JSON.stringify({
        strategy: route === "/app" ? "flip" : route === "/brrrr" ? "brrrr" : "multifamily",
        timestamp: Date.now(),
        address,
        estimatedValue: estimate.valMid,
        rentEstimate: estimate.monthlyRent,
        squareFootage: num(sqft),
        bedrooms: num(beds),
        bathrooms: num(baths),
        yearBuilt: num(yearBuilt),
      }));
    }
    navigate(route);
  }

  const hasEstimate = !!estimate;

  return (
    <div className="pw-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Hero */}
      <div className="pw-hero">
        <div className="pw-glow" />
        <div className="pw-tag">💰 Free Property Estimator</div>
        <h1>What's my property<br /><span>actually worth?</span></h1>
        <p>Get an instant estimated value, rental income, cap rate, and cash flow analysis — no account needed. Enter your property details below.</p>
      </div>

      {/* Body */}
      <div className="pw-body">

        {/* LEFT — Inputs */}
        <div>

          {/* Property Details */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-icon" style={{background:"rgba(59,158,255,0.12)"}}>🏠</div>
              <div className="pw-card-title">Property Details</div>
            </div>
            <div className="pw-card-body">
              <div className="pw-field">
                <div className="pw-label" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>Property Address</span>
                  {lookupFilled && <span style={{fontSize:10,fontWeight:700,color:"var(--green)",background:"rgba(52,217,138,0.1)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:99,padding:"2px 8px"}}>✅ Auto-filled from public records</span>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <AddressAutocomplete
                    className="pw-input"
                    placeholder="123 Main St, Austin, TX 78701 or Calgary, AB"
                    value={address}
                    onChange={setAddress}
                    onSelect={(addr) => { setAddress(addr); }}
                    onKeyDown={handleAddressKey}
                    style={{flex:1}}
                  />
                  <button
                    onClick={lookupAddress}
                    disabled={lookupLoading || !address.trim()}
                    style={{background:"var(--blue)",color:"#fff",border:"none",borderRadius:9,padding:"0 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",opacity:lookupLoading||!address.trim()?0.6:1,transition:"opacity 0.15s",flexShrink:0}}
                  >
                    {lookupLoading ? "…" : "🔍 Auto-fill"}
                  </button>
                </div>
                {lookupError && <div style={{fontSize:11,color:"var(--red)",marginTop:4}}>{lookupError}</div>}
                <div style={{fontSize:11,color:"var(--dim)",marginTop:4}}>Enter address + press Auto-fill to populate beds, baths, sqft, year built automatically</div>
              </div>
              <div className="pw-field">
                <div className="pw-label">Market / Location Type <span style={{color:"var(--red)"}}>*</span></div>
                <div className="pw-label-hint">Pick the closest match to your property's location</div>
                <select className="pw-select" value={market} onChange={e => setMarket(e.target.value)}>
                  <option value="">— Select your market —</option>
                  {Object.keys(MARKETS).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="pw-field">
                <div className="pw-label">Property Type</div>
                <select className="pw-select" value={propType} onChange={e => setPropType(e.target.value)}>
                  {Object.keys(PROP_TYPES).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="pw-field">
                <div className="pw-label">Condition</div>
                <select className="pw-select" value={condition} onChange={e => setCondition(e.target.value)}>
                  {Object.keys(CONDITIONS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="pw-row">
                <div className="pw-field">
                  <div className="pw-label">Bedrooms</div>
                  <select className="pw-select" value={beds} onChange={e => setBeds(e.target.value)}>
                    {["1","2","3","4","5","6"].map(n => <option key={n} value={n}>{n} bed{n!=="1"?"s":""}</option>)}
                  </select>
                </div>
                <div className="pw-field">
                  <div className="pw-label">Bathrooms</div>
                  <select className="pw-select" value={baths} onChange={e => setBaths(e.target.value)}>
                    {["1","1.5","2","2.5","3","3.5","4"].map(n => <option key={n} value={n}>{n} bath{parseFloat(n)!==1?"s":""}</option>)}
                  </select>
                </div>
              </div>
              <div className="pw-row">
                <div className="pw-field">
                  <div className="pw-label">Square Footage <span style={{color:"var(--red)"}}>*</span></div>
                  <input className="pw-input" type="number" placeholder="1800" value={sqft} onChange={e => setSqft(e.target.value)} />
                </div>
                <div className="pw-field">
                  <div className="pw-label">Year Built</div>
                  <input className="pw-input" type="number" placeholder="1995" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Purchase / Financing */}
          <div className="pw-card">
            <div className="pw-card-header">
              <div className="pw-card-icon" style={{background:"rgba(52,217,138,0.12)"}}>💵</div>
              <div className="pw-card-title">Purchase & Financing (optional)</div>
            </div>
            <div className="pw-card-body">
              <div className="pw-field">
                <div className="pw-label">Asking / Purchase Price</div>
                <div className="pw-label-hint">Leave blank to use the estimated value</div>
                <input className="pw-input" type="number" placeholder="380000" value={askPrice} onChange={e => setAskPrice(e.target.value)} />
              </div>
              <div className="pw-row">
                <div className="pw-field">
                  <div className="pw-label">Down Payment (%)</div>
                  <input className="pw-input" type="number" placeholder="25" value={100 - num(mortgage)} onChange={e => setMortgage(String(100 - num(e.target.value)))} />
                </div>
                <div className="pw-field">
                  <div className="pw-label">Interest Rate (%)</div>
                  <input className="pw-input" type="number" placeholder="7.0" step="0.1" value={rate} onChange={e => setRate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — Results */}
        <div>
          <div className="pw-results-card">
            <div className="pw-results-header">
              <div>
                <div className="pw-results-title">💰 Property Estimate</div>
                <div className="pw-results-sub">{hasEstimate ? "Updates live as you fill in details" : "Fill in market + sqft to see estimates"}</div>
              </div>
              {hasEstimate && <div style={{fontSize:11,color:"var(--green)",fontWeight:700,background:"rgba(52,217,138,0.1)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:99,padding:"3px 10px"}}>● Live</div>}
            </div>

            <div className="pw-results-body">
              {!hasEstimate ? (
                <div className="pw-empty">
                  <div className="pw-empty-icon">🏡</div>
                  <div className="pw-empty-title">Enter your property details</div>
                  <div className="pw-empty-sub">Select a market and enter the square footage to get an instant estimated value, rent projection, and cash flow analysis.</div>
                </div>
              ) : (
                <>
                  {/* Value Range */}
                  <div className="pw-value-range">
                    <div className="pw-range-label">Estimated Market Value</div>
                    <div className="pw-range-main">{fmt(estimate.valMid)}</div>
                    <div className="pw-range-low-high">
                      <span style={{color:"var(--sub)"}}>{fmt(estimate.valLow)}</span>
                      <span className="pw-range-arrow">→</span>
                      <span style={{color:"var(--text)"}}>{fmt(estimate.valHigh)}</span>
                    </div>
                    <div className="pw-range-psf">~{fmt(estimate.psfMid)}/sqft · {num(sqft).toLocaleString()} sqft</div>
                  </div>

                  {/* Ask price comparison */}
                  {estimate.askDiff !== null && (
                    <div style={{
                      background: estimate.askDiff >= 0 ? "rgba(52,217,138,0.07)" : "rgba(242,92,92,0.07)",
                      border: `1px solid ${estimate.askDiff >= 0 ? "rgba(52,217,138,0.2)" : "rgba(242,92,92,0.2)"}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13,
                    }}>
                      <span style={{fontWeight:700, color: estimate.askDiff >= 0 ? "var(--green)" : "var(--red)"}}>
                        {estimate.askDiff >= 0 ? "✅ Listed below estimated value" : "⚠️ Listed above estimated value"}
                      </span>
                      <span style={{color:"var(--sub)", marginLeft:6}}>
                        {estimate.askDiff >= 0 ? `${fmt(estimate.askDiff)} under` : `${fmt(Math.abs(estimate.askDiff))} over`} ({(Math.abs(estimate.askPct)*100).toFixed(1)}%)
                      </span>
                    </div>
                  )}

                  {/* Rent estimate */}
                  <div className="pw-rent-block">
                    <div className="pw-rent-label">Estimated Monthly Rent</div>
                    <div className="pw-rent-val">{fmt(estimate.monthlyRent)}<span style={{fontSize:16,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
                    <div className="pw-rent-sub">{fmt(estimate.annualRent)}/yr gross · {fmt(estimate.noi)}/yr NOI after expenses</div>
                  </div>

                  {/* Key metrics */}
                  <div style={{marginBottom:16}}>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Cap Rate</span>
                      <span className="pw-metric-val" style={{color: estimate.capRate >= 0.06 ? "var(--green)" : estimate.capRate >= 0.04 ? "var(--amber)" : "var(--red)"}}>{fmtPct(estimate.capRate)}</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Gross Rent Multiplier (GRM)</span>
                      <span className="pw-metric-val">{estimate.grm.toFixed(1)}x</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Monthly Mortgage Payment</span>
                      <span className="pw-metric-val">{fmt(estimate.payment)}</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Monthly Cash Flow</span>
                      <span className="pw-metric-val" style={{color: estimate.monthlyCF >= 0 ? "var(--green)" : "var(--red)"}}>{fmt(estimate.monthlyCF)}</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Cash-on-Cash Return</span>
                      <span className="pw-metric-val" style={{color: estimate.coc >= 0.08 ? "var(--green)" : estimate.coc >= 0 ? "var(--amber)" : "var(--red)"}}>{fmtPct(estimate.coc)}</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">DSCR</span>
                      <span className="pw-metric-val" style={{color: estimate.dscr >= 1.25 ? "var(--green)" : estimate.dscr >= 1 ? "var(--amber)" : "var(--red)"}}>{estimate.dscr.toFixed(2)}x</span>
                    </div>
                    <div className="pw-metric-row">
                      <span className="pw-metric-name">Down Payment Required</span>
                      <span className="pw-metric-val">{fmt(estimate.downPay)}</span>
                    </div>
                  </div>

                  {/* Verdict */}
                  {(() => {
                    const cf = estimate.monthlyCF;
                    const cap = estimate.capRate;
                    if (cf >= 300 && cap >= 0.06) return (
                      <div className="pw-verdict" style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.25)"}}>
                        <div className="pw-verdict-title" style={{color:"var(--green)"}}>✅ Strong rental candidate</div>
                        <div className="pw-verdict-sub" style={{color:"var(--sub)"}}>Positive cash flow with a solid cap rate. Worth running a full BRRRR or multifamily analysis.</div>
                      </div>
                    );
                    if (cf >= 0 && cap >= 0.04) return (
                      <div className="pw-verdict" style={{background:"rgba(240,160,48,0.08)",border:"1px solid rgba(240,160,48,0.25)"}}>
                        <div className="pw-verdict-title" style={{color:"var(--amber)"}}>⚠️ Marginal rental — worth analyzing</div>
                        <div className="pw-verdict-sub" style={{color:"var(--sub)"}}>Low but positive cash flow. Strong appreciation market. Consider running a full analysis with exact numbers.</div>
                      </div>
                    );
                    return (
                      <div className="pw-verdict" style={{background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.25)"}}>
                        <div className="pw-verdict-title" style={{color:"var(--red)"}}>🚫 Likely negative cash flow as rental</div>
                        <div className="pw-verdict-sub" style={{color:"var(--sub)"}}>At these estimates, rents don't cover debt service. A flip or BRRRR strategy may be better — or negotiate the price down.</div>
                      </div>
                    );
                  })()}

                  {/* Strategy links */}
                  <div className="pw-strategy-btns">
                    <div className="pw-strategy-label">Run a full analysis →</div>
                    <button className="pw-strat-btn" onClick={() => goToStrategy("/app")}>
                      <span className="pw-strat-icon">🏚️</span>
                      <div className="pw-strat-text">
                        <div className="pw-strat-name">Fix & Flip Analyzer</div>
                        <div className="pw-strat-desc">Full profit margin, MAO, deal grade · data pre-filled</div>
                      </div>
                    </button>
                    <button className="pw-strat-btn" onClick={() => goToStrategy("/brrrr")}>
                      <span className="pw-strat-icon">🔄</span>
                      <div className="pw-strat-text">
                        <div className="pw-strat-name">BRRRR Calculator</div>
                        <div className="pw-strat-desc">Cash recycling, refi strategy, post-refi cash flow</div>
                      </div>
                    </button>
                    <button className="pw-strat-btn" onClick={() => goToStrategy("/commercial")}>
                      <span className="pw-strat-icon">🏢</span>
                      <div className="pw-strat-text">
                        <div className="pw-strat-name">Multifamily Underwriter</div>
                        <div className="pw-strat-desc">Full NOI, cap rate, DSCR, 5-year projection</div>
                      </div>
                    </button>
                  </div>

                  <div className="pw-disclaimer">
                    <strong>⚠️ Estimates only.</strong> These figures are based on market benchmarks and typical property data — not actual comparable sales or MLS data. Always verify with local comps and a licensed appraiser before making investment decisions.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
