import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { generateTier1Memo } from "./lib/tier1Memo";
import { irr as solveIRR, withCumulative } from "./lib/finance";
import { useDocMeta } from "./lib/seo";
import { celebrateFirstSave } from "./lib/celebrate";
import DealCoach from "./components/DealCoach";
import DealReadout from "./components/DealReadout";
import { compareToHistory } from "./lib/dealHistory";
import { getSmartDefaults } from "./lib/smartDefaults";
import { useDraftSync } from "./lib/draftSync";
import { useAddressAutoFill, derivePatch } from "./lib/addressAutoFill";
import MetricTip from "./components/MetricTip";
import MetricWarning from "./components/MetricWarning";
import SimilarDealsHint from "./components/SimilarDealsHint";
import AddressContextCard from "./components/AddressContextCard";
import BuddyLoading from "./components/BuddyLoading";
import PropertyIntelCard from "./components/PropertyIntelCard";
import CrossLinkCTA from "./components/CrossLinkCTA";
import TopNav from "./components/TopNav";
import AddressAutocomplete from "./AddressAutocomplete";
import ShareDealButton from "./components/ShareDealButton";
import AIDocumentDrop from "./components/AIDocumentDrop";
import LossToLeasePanel from "./components/LossToLeasePanel";
import XrayPrefillBanner from "./components/XrayPrefillBanner";
import { getXrayPrefill, clearXrayPrefill } from "./lib/xrayPrefill";
import TierGate from "./components/TierGate";

// Lazy-load the charts card so recharts (~200KB gzipped) doesn't ship in the
// main bundle. Users only download it when they actually have a deal to view.
const BRRRRCharts = lazy(() => import("./components/BRRRRCharts"));

// ─── Utilities ───────────────────────────────────────────────────────────────
const num = v => parseFloat(v) || 0;
const fmt  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const fmtPct = n => (isNaN(n)||!isFinite(n)) ? "—" : `${(n*100).toFixed(2)}%`;
const fmtX   = n => (isNaN(n)||!isFinite(n)||Math.abs(n)>999) ? "—" : `${n.toFixed(2)}x`;

function calcMortgage(principal, annualRate, amortYears) {
  const p = num(principal), r = num(annualRate)/100/12, n = num(amortYears)*12;
  // NB: a valid 0% rate would make the standard mortgage formula divide-by-zero.
  // Rate === 0 is a legit (if rare) input — return p/n rather than "no payment".
  if (!p || !n) return 0;
  if (r === 0) return p / n;
  return p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
}

function loanBalance(principal, annualRate, amortYears, yearsElapsed) {
  const p = num(principal), r = num(annualRate)/100/12;
  const n = num(amortYears)*12, k = num(yearsElapsed)*12;
  // Same 0%-rate correctness fix: with r=0 the balance is p - (p/n)*k.
  if (!p || !n) return p;
  if (r === 0) return Math.max(0, p - (p / n) * k);
  return p*(Math.pow(1+r,n)-Math.pow(1+r,k))/(Math.pow(1+r,n)-1);
}

// Lightweight Canadian-address detector — same heuristic as PropertyIntelligence.
function isCanadian(addr) {
  if (!addr) return false;
  if (/\bcanada\b/i.test(addr)) return true;
  return /\b(AB|BC|ON|QC|MB|SK|NS|NB|NL|PE|YT|NT|NU)\b/i.test(addr);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'Geist',sans-serif;font-size:14px!important}

  .br-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .br-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .br-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.br-logo span{color:var(--blue)}
  .br-nav-right{display:flex;align-items:center;gap:10px}
  .br-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 12px;border-radius:7px}.br-nav-link:hover{color:var(--text)}.br-nav-link.active{color:var(--blue)}
  .br-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;text-decoration:none}
  .br-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}.br-nav-ghost:hover{color:var(--text)}

  /* Hero */
  .br-hero{text-align:center;padding:44px 24px 32px;position:relative;overflow:hidden}
  .br-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(167,130,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(167,130,255,0.025) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .br-hero-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(167,130,255,0.08) 0%,transparent 65%);pointer-events:none}
  .br-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(167,130,255,0.08);border:1px solid rgba(167,130,255,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--purple);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .br-hero h1{font-size:clamp(24px,4.5vw,40px);font-weight:800;letter-spacing:-1.5px;color:var(--text);line-height:1.1;margin-bottom:10px;position:relative;z-index:1}
  .br-hero h1 span{color:var(--purple)}
  .br-hero p{font-size:15px;color:var(--sub);max-width:520px;margin:0 auto;line-height:1.65;position:relative;z-index:1}
  .br-letters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;position:relative;z-index:1}
  .br-letter-pill{display:flex;align-items:center;gap:6px;background:rgba(167,130,255,0.07);border:1px solid rgba(167,130,255,0.15);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--purple);font-weight:600}
  .br-letter-pill span{color:var(--sub);font-weight:400}

  /* Layout */
  .br-body{max-width:1120px;margin:0 auto;padding:28px 20px 80px;display:grid;grid-template-columns:400px 1fr;gap:24px;align-items:start}
  @media(max-width:840px){.br-body{grid-template-columns:1fr}}
  @media(max-width:520px){.br-body{padding:16px 14px 60px}}

  /* Cards */
  .br-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px}
  .br-card-header{padding:14px 18px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;gap:10px}
  .br-card-icon{width:28px;height:28px;border-radius: 6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .br-card-title{font-size:13.5px;font-weight:700;color:var(--text)}
  .br-card-sub{font-size:11px;color:var(--sub);margin-top:1px}
  .br-card-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}

  /* Inputs */
  .br-field{display:flex;flex-direction:column;gap:4px}
  .br-label{font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px;display:flex;justify-content:space-between;align-items:center}
  .br-hint{font-size:10.5px;color:var(--green);font-weight:600}
  .br-hint.amber{color:var(--amber)}
  .br-input{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:10px 13px;font-size:14px;color:var(--text);outline:none;width:100%;transition:border 0.15s}
  .br-input:focus{border-color:rgba(167,130,255,0.4);background:rgba(167,130,255,0.03)}
  .br-input::placeholder{color:var(--dim)}
  .br-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .br-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .br-divider{height:1px;background:var(--borderf)}

  /* Results */
  .br-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .br-metric{background:var(--card2);border-radius: 10px;padding:14px;border:1px solid var(--borderf)}
  .br-metric-label{font-size:10px;font-weight:600;color:var(--sub);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
  .br-metric-val{font-size:21px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1}
  .br-metric-sub{font-size:10px;color:var(--dim);margin-top:4px}
  .br-metric.green{border-color:rgba(52,217,138,0.2);background:rgba(52,217,138,0.05)}.br-metric.green .br-metric-val{color:var(--green)}
  .br-metric.blue{border-color:rgba(59,158,255,0.2);background:rgba(59,158,255,0.05)}.br-metric.blue .br-metric-val{color:var(--blue)}
  .br-metric.purple{border-color:rgba(167,130,255,0.2);background:rgba(167,130,255,0.05)}.br-metric.purple .br-metric-val{color:var(--purple)}
  .br-metric.amber{border-color:rgba(240,160,48,0.2);background:rgba(240,160,48,0.05)}.br-metric.amber .br-metric-val{color:var(--amber)}
  .br-metric.red{border-color:rgba(242,92,92,0.2);background:rgba(242,92,92,0.05)}.br-metric.red .br-metric-val{color:var(--red)}
  .br-metric.full{grid-column:1/-1}

  /* BRRRR verdict */
  .br-verdict{border-radius: 16px;padding:20px;text-align:center;margin-bottom:4px}
  .br-verdict-icon{font-size:36px;margin-bottom:8px}
  .br-verdict-title{font-size:18px;font-weight:800;letter-spacing:-0.3px;margin-bottom:6px}
  .br-verdict-sub{font-size:13px;line-height:1.55;max-width:320px;margin:0 auto}

  /* Waterfall */
  .br-waterfall{background:var(--card2);border-radius: 10px;padding:14px}
  .br-waterfall-title{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
  .br-wf-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(15,23,42,0.04);font-size:12.5px}
  .br-wf-row:last-child{border-bottom:none;font-weight:700;font-size:13px;padding-top:9px;margin-top:2px}
  .br-wf-label{color:var(--sub)}.br-wf-val{font-family:'Geist Mono',monospace;font-size:12px;font-weight:500}
  .br-wf-val.pos{color:var(--green)}.br-wf-val.neg{color:var(--red)}.br-wf-val.purple{color:var(--purple)}

  /* Placeholder */
  .br-placeholder{background:var(--card);border:1px dashed var(--borderf);border-radius:16px;padding:52px 24px;text-align:center}
  .br-placeholder-icon{font-size:36px;margin-bottom:12px}
  .br-placeholder-title{font-size:15px;font-weight:600;color:var(--sub);margin-bottom:6px}
  .br-placeholder-sub{font-size:13px;color:var(--dim);line-height:1.6}

  /* Phase labels */
  .br-phase{display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .br-phase-dot{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}
  .br-phase-label{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
`;

export default function BRRRRCalculator() {
  const navigate = useNavigate();
  useDocMeta({
    title: "BRRRR Calculator",
    description: "Model Buy/Rehab/Rent/Refi/Repeat deals with real DSCR, IRR, year-by-year cash flow, and AI deal thesis. Free for US + Canadian investors.",
  });
  const { user, signOut, getSubscription } = useAuth();
  const [isPro, setIsPro]         = useState(false);
  const [proChecked, setProChecked] = useState(false);

  // ── Loss-to-Lease (rent roll → CMHC delta) ─────────────────────────────────
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
      const addr = (form?.address || "").toLowerCase();
      let city = "calgary", province = "alberta";
      const cityMatches = [
        ["edmonton","alberta"],["calgary","alberta"],["red deer","alberta"],["lethbridge","alberta"],
        ["vancouver","bc"],["victoria","bc"],["kelowna","bc"],["abbotsford","bc"],
        ["toronto","ontario"],["ottawa","ontario"],["hamilton","ontario"],["london","ontario"],
        ["kitchener","ontario"],["windsor","ontario"],["kingston","ontario"],["barrie","ontario"],
        ["montreal","quebec"],["quebec city","quebec"],["winnipeg","manitoba"],
        ["saskatoon","saskatchewan"],["regina","saskatchewan"],["halifax","nova scotia"],
        ["moncton","new brunswick"],["saint john","new brunswick"],
        ["st. john's","newfoundland and labrador"],["charlottetown","prince edward island"],
      ];
      for (const [c,p] of cityMatches) {
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

  useEffect(() => {
    async function check() {
      if (!user) { setIsPro(false); setProChecked(true); return; }
      const { data } = await getSubscription();
      setIsPro(data?.status === 'active' && data?.plan === 'pro');
      setProChecked(true);
    }
    check();
  }, [user]);

  const [saved, setSaved] = useState(false);

  // CMHC-anchored rent prediction state — only used for Canadian addresses
  const [rentPredicting, setRentPredicting] = useState(false);
  const [rentPrediction, setRentPrediction] = useState(null); // { predictedRent, range, breakdown }
  const [predictBeds, setPredictBeds] = useState(2);
  const [aiThesis, setAiThesis] = useState(null); // { thesis, source }

  // ── Pre-fill from PropertyHub ─────────────────────────────────────────────
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Simple mode: hide Phases 1-5 detail behind one compact 5-field card.
  // All hidden form values keep their sane defaults, so the calc still runs.
  // Default ON; persist user preference in localStorage.
  const [simpleMode, setSimpleMode] = useState(() => {
    try { return localStorage.getItem("rde_brrrr_simple") !== "0"; }
    catch { return true; }
  });
  function toggleSimpleMode() {
    setSimpleMode(v => {
      try { localStorage.setItem("rde_brrrr_simple", v ? "0" : "1"); } catch {}
      return !v;
    });
  }

  const [form, setForm] = useState(() => {
    // Priority 0: Strategy Verdicts handoff (StrategyVerdicts.jsx → sessionStorage).
    // Uses exact pre-computed purchase / repair / arv / rent from /property's
    // verdict panel — no heuristic haircut, no AVM guessing. Consumed once
    // then cleared. Only fires for the brrrr/hold strategies — flip has its
    // own /flip → DealAnalyzer surface with its own prefill consumer.
    try {
      const raw = sessionStorage.getItem("rde_strategy_prefill");
      if (raw) {
        const pf = JSON.parse(raw);
        const isFresh = pf.ts && Date.now() - pf.ts < 5 * 60 * 1000;
        const isForUs = ["brrrr", "hold"].includes(pf.strategy);
        if (isFresh && isForUs) {
          sessionStorage.removeItem("rde_strategy_prefill");
          return {
            dealName: "",
            address:        pf.address       || "",
            purchasePrice:  pf.purchasePrice ? String(Math.round(pf.purchasePrice)) : "",
            closingCostsPct: "2",
            rehabBudget:    pf.repairCost    ? String(Math.round(pf.repairCost))    : "",
            holdingMonths:  "3",
            monthlyHoldingCost: "",
            monthlyRent:    pf.monthlyRent   ? String(Math.round(pf.monthlyRent))   : "",
            vacancyPct: "5", otherIncome: "0", propTax: "", insurance: "",
            managementPct: "8", maintenancePct: "5", utilities: "0",
            arv:            pf.arv           ? String(Math.round(pf.arv))            : "",
            refinanceLTV: "75", refiRate: "6.5", refiAmort: "30", refiClosingCostsPct: "1.5",
            holdYears: "5", rentGrowth: "3", opexGrowth: "2", appreciation: "3", exitSellingPct: "5",
          };
        }
      }
    } catch {}
    // Priority 1: URL params (Chrome extension, shareable links)
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("purchase")) {
        return {
          dealName: "",
          address:        sp.get("addr")     || "",
          purchasePrice:  sp.get("purchase") || "",
          closingCostsPct: "2",
          rehabBudget:    sp.get("repair")   || "",
          holdingMonths:  "3",
          monthlyHoldingCost: "",
          monthlyRent: "",
          vacancyPct: "5", otherIncome: "0", propTax: "", insurance: "",
          managementPct: "8", maintenancePct: "5", utilities: "0",
          arv: sp.get("purchase") ? String(Math.round(parseFloat(sp.get("purchase")) * 1.35)) : "",
          refinanceLTV: "80", refiRate: "5.75", refiAmort: "25", refiClosingCostsPct: "1.5",
          holdYears: "5", rentGrowth: "3", opexGrowth: "2", appreciation: "3", exitSellingPct: "5",
        };
      }
    } catch {}
    // Priority 2: localStorage handoff from Property Intelligence
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (raw) {
        const pf = JSON.parse(raw);
        if (Date.now() - pf.timestamp < 5 * 60 * 1000 && (!pf.strategy || pf.strategy === "brrrr")) {
          localStorage.removeItem("rde_prefill");
          return {
            dealName: "",
            address: pf.address || "",
            purchasePrice: pf.estimatedValue ? String(Math.round(pf.estimatedValue * 0.75)) : "",
            closingCostsPct: "2",
            rehabBudget: "",
            holdingMonths: "3",
            monthlyHoldingCost: "",
            monthlyRent: pf.rentEstimate ? String(Math.round(pf.rentEstimate)) : "",
            vacancyPct: "5",
            otherIncome: "0",
            propTax: pf.propertyTaxes ? String(Math.round(pf.propertyTaxes / 12)) : "",
            insurance: "",
            managementPct: "8",
            maintenancePct: "5",
            utilities: "0",
            arv: pf.estimatedValue ? String(Math.round(pf.estimatedValue)) : "",
            refinanceLTV: "80",
            refiRate: "5.75",
            refiAmort: "25",
            refiClosingCostsPct: "1.5",
            // Phase 5: hold + exit assumptions
            holdYears: "5",
            rentGrowth: "3",
            opexGrowth: "2",
            appreciation: "3",
            exitSellingPct: "5",
          };
        }
      }
    } catch {}
    return {
    // Deal info
    dealName: "",
    address: "",
    // Phase 1: Buy
    purchasePrice: "",
    closingCostsPct: "2",
    // Phase 2: Rehab
    rehabBudget: "",
    holdingMonths: "3",
    monthlyHoldingCost: "",
    // Phase 3: Rent
    monthlyRent: "",
    vacancyPct: "5",
    otherIncome: "0",
    propTax: "",
    insurance: "",
    managementPct: "8",
    maintenancePct: "5",
    utilities: "0",
    // Phase 4: Refinance
    arv: "",
    refinanceLTV: "80",
    refiRate: "5.75",
    refiAmort: "25",
    refiClosingCostsPct: "1.5",
    // Phase 5: hold + exit
    holdYears: "5",
    rentGrowth: "3",
    opexGrowth: "2",
    appreciation: "3",
    exitSellingPct: "5",
  };
  });

  function saveDeal() {
    const deal = {
      id: Date.now(),
      type: "brrrr",
      name: form.dealName || form.address || "Untitled BRRRR Deal",
      address: form.address,
      savedAt: new Date().toISOString(),
      inputs: { ...form },
      results: calc ? {
        totalCashIn: calc.totalCashIn,
        noi: calc.noi,
        annualCF: calc.annualCF,
        monthlyCF: calc.monthlyCF,
        dscr: calc.dscr,
        coc: calc.coc === Infinity ? 9999 : calc.coc,
        isTrueBRRRR: calc.isTrueBRRRR,
        cashLeftInDeal: calc.cashLeftInDeal,
        cashPulledOut: calc.cashPulledOut,
        equityCreated: calc.equityCreated,
        refiLoanAmount: calc.refiLoanAmount,
        refiMonthlyPayment: calc.refiMonthlyPayment,
        refiCap: calc.refiCap,
        equityOnCost: calc.equityOnCost,
      } : null,
      verdict: verdict ? verdict.title : null,
    };
    const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
    existing.unshift(deal);
    localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
    celebrateFirstSave({ kind: "brrrr" });
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-fill from public records when address is typed
  const autoLookup = useAddressAutoFill(form.address, { minLength: 8 });
  const autoPatch = useMemo(
    () => derivePatch(autoLookup.data, form, { strategy: "brrrr" }),
    [autoLookup.data, form]
  );

  // Auto-save drafts (localStorage + Supabase for signed-in users)
  const { restoredAt, lastSavedAt, status: draftStatus, clearDraft } = useDraftSync({
    strategy: "brrrr",
    form,
    setForm,
  });

  // X-Ray prefill — read on mount, pre-fill address only when empty.
  const [xrayPrefill, setXrayPrefill] = useState(null);
  useEffect(() => {
    const xp = getXrayPrefill();
    if (!xp) return;
    setXrayPrefill(xp);
    setForm(prev => ({
      ...prev,
      address:   prev.address || xp.address,
      yearBuilt: prev.yearBuilt || (xp.yearBuilt ? Math.floor(parseFloat(xp.yearBuilt)) : prev.yearBuilt),
    }));
  }, []);

  const calc = useMemo(() => {
    const pp = num(form.purchasePrice);
    const rehab = num(form.rehabBudget);
    const arv = num(form.arv);
    if (!pp && !rehab && !arv) return null;

    // ── Phase 1 & 2: Total cash in
    const closingCostsBuy = pp * (num(form.closingCostsPct)/100);
    const holdingCost = num(form.holdingMonths) * num(form.monthlyHoldingCost);
    const totalCashIn = pp + rehab + closingCostsBuy + holdingCost;

    // ── Phase 3: Rental income & NOI
    const grossRent = num(form.monthlyRent) * 12;
    const vacancyLoss = grossRent * (num(form.vacancyPct)/100);
    const otherIncome = num(form.otherIncome) * 12;
    const egi = grossRent - vacancyLoss + otherIncome;
    const propTax = num(form.propTax);
    const insurance = num(form.insurance);
    const management = egi * (num(form.managementPct)/100);
    const maintenance = egi * (num(form.maintenancePct)/100);
    const utilities = num(form.utilities);
    const totalOpEx = propTax + insurance + management + maintenance + utilities;
    const noi = egi - totalOpEx;
    const entryCap = pp > 0 ? noi/pp : 0;

    // ── Phase 4: Refinance
    const refiLoanAmount = arv * (num(form.refinanceLTV)/100);
    const refiClosingCosts = refiLoanAmount * (num(form.refiClosingCostsPct)/100);
    const refiNetProceeds = refiLoanAmount - refiClosingCosts;
    const cashReturnedToInvestor = refiNetProceeds; // gross proceeds from refi
    const cashLeftInDeal = Math.max(0, totalCashIn - refiNetProceeds);
    const cashPulledOut = Math.max(0, refiNetProceeds - totalCashIn);
    const isTrueBRRRR = refiNetProceeds >= totalCashIn;

    // ── Phase 5: Post-refi returns
    const refiMonthlyPayment = calcMortgage(refiLoanAmount, form.refiRate, form.refiAmort);
    const annualDebtService = refiMonthlyPayment * 12;
    const annualCF = noi - annualDebtService;
    const monthlyCF = annualCF / 12;
    const dscr = annualDebtService > 0 ? noi/annualDebtService : 0;
    const coc = cashLeftInDeal > 0 ? annualCF/cashLeftInDeal : (isTrueBRRRR ? Infinity : 0);

    // ── Equity created
    const equityCreated = arv - totalCashIn;
    const equityOnCost = totalCashIn > 0 ? equityCreated/totalCashIn : 0;
    const arvOnCost = totalCashIn > 0 ? arv/totalCashIn : 0;
    const refiCap = arv > 0 ? noi/arv : 0;

    // ── Phase 6: Hold-period projection + exit (post-refi cash flow trajectory)
    const hold = Math.max(1, num(form.holdYears) || 5);
    const rg   = num(form.rentGrowth)/100;
    const og   = num(form.opexGrowth)/100;
    const ap   = num(form.appreciation)/100;
    const sellPct = num(form.exitSellingPct)/100;

    // OpEx split: variable (mgmt + maint, % of EGI) vs fixed (tax + insurance + utilities)
    const opexFixed = propTax + insurance + utilities;

    const years = Array.from({length: hold}, (_, i) => i + 1);
    const projBase = years.map(yr => {
      const grossYr   = grossRent * Math.pow(1+rg, yr-1);
      const vacYr     = grossYr * (num(form.vacancyPct)/100);
      const otherYr   = otherIncome * Math.pow(1+rg, yr-1);
      const egiYr     = grossYr - vacYr + otherYr;
      const mgmtYr    = egiYr * (num(form.managementPct)/100);
      const maintYr   = egiYr * (num(form.maintenancePct)/100);
      const opexFixedYr = opexFixed * Math.pow(1+og, yr-1);
      const opexYr    = mgmtYr + maintYr + opexFixedYr;
      const noiYr     = egiYr - opexYr;
      const btcfYr    = noiYr - annualDebtService;
      const dscrYr    = annualDebtService > 0 ? noiYr/annualDebtService : 0;
      return {yr, grossYr, egiYr, opexYr, noiYr, btcfYr, dscrYr};
    });
    const proj = withCumulative(projBase, "btcfYr", "cumBtcf");

    // Exit at year `hold`: appreciated ARV, selling costs, remaining loan balance
    const exitArv     = arv * Math.pow(1+ap, hold);
    const exitSellCosts = exitArv * sellPct;
    const refiLoanBal = loanBalance(refiLoanAmount, form.refiRate, form.refiAmort, hold);
    const exitProceeds= exitArv - exitSellCosts - refiLoanBal;

    // ── True IRR — investor's effective initial position is cashLeftInDeal
    // (after the refi recouped refiNetProceeds). Y0 = -cashLeftInDeal, Y1..N
    // = post-refi BTCF, Year N also gets exitProceeds.
    let irrValue = null;
    let irrFlows = null;
    if (cashLeftInDeal > 0) {
      irrFlows = [-cashLeftInDeal, ...proj.map((p, i) =>
        i === proj.length - 1 ? p.btcfYr + exitProceeds : p.btcfYr
      )];
      irrValue = solveIRR(irrFlows);
    } else {
      // True BRRRR: nothing left in the deal → IRR is infinite/undefined.
      // Display as ∞ in the UI and skip the solver.
      irrFlows = [0, ...proj.map((p, i) =>
        i === proj.length - 1 ? p.btcfYr + exitProceeds : p.btcfYr
      )];
      irrValue = Infinity;
    }

    // Cumulative position curve for the equity-buildup chart
    const equityCurve = [{ yr: 0, cum: -cashLeftInDeal }, ...proj.map((p, i) => ({
      yr: p.yr,
      cum: -cashLeftInDeal + p.cumBtcf + (i === proj.length - 1 ? exitProceeds : 0),
    }))];

    const totalHoldCF = proj.reduce((a, p) => a + p.btcfYr, 0);
    const totalReturn = totalHoldCF + exitProceeds;
    const eqMultiple  = cashLeftInDeal > 0 ? totalReturn/cashLeftInDeal : Infinity;

    return {
      pp, rehab, arv,
      closingCostsBuy, holdingCost, totalCashIn,
      grossRent, vacancyLoss, otherIncome, egi,
      propTax, insurance, management, maintenance, utilities, totalOpEx,
      noi, entryCap,
      refiLoanAmount, refiClosingCosts, refiNetProceeds,
      cashLeftInDeal, cashPulledOut, isTrueBRRRR,
      refiMonthlyPayment, annualDebtService, annualCF, monthlyCF,
      dscr, coc, equityCreated, equityOnCost, arvOnCost, refiCap,
      // hold-period additions
      hold, exitArv, exitSellCosts, refiLoanBal, exitProceeds,
      totalHoldCF, totalReturn, eqMultiple,
      irr: irrValue,
      proj, equityCurve,
    };
  }, [form]);

  const hasData = calc && (calc.pp > 0 || calc.arv > 0);

  // Verdict
  const getVerdict = () => {
    if (!calc || !hasData) return null;
    if (calc.isTrueBRRRR && calc.annualCF > 0 && calc.dscr >= 1.2)
      return { icon:"🔄", title:"True BRRRR — Infinite Returns", sub:`You pull ${fmt(calc.cashPulledOut)} out at refi, own the property with none of your money left in, and it still cash flows ${fmt(calc.monthlyCF)}/mo. This is the holy grail.`, cls:"green", border:"rgba(52,217,138,0.2)", bg:"rgba(52,217,138,0.06)" };
    if (calc.isTrueBRRRR && calc.annualCF <= 0)
      return { icon:"⚠️", title:"Full Recycle — But Negative Cash Flow", sub:`You get all your money back at refi but the property doesn't cash flow. Improve rents or reduce expenses before pulling the trigger.`, cls:"amber", border:"rgba(240,160,48,0.2)", bg:"rgba(240,160,48,0.06)" };
    if (!calc.isTrueBRRRR && calc.annualCF > 0 && calc.cashLeftInDeal > 0)
      return { icon:"💼", title:"Partial BRRRR — Cash Left In", sub:`${fmt(calc.cashLeftInDeal)} stays in the deal. Still cash flows ${fmt(calc.monthlyCF)}/mo — solid return but not infinite. Negotiate harder or find a higher ARV.`, cls:"blue", border:"rgba(59,158,255,0.2)", bg:"rgba(59,158,255,0.06)" };
    return { icon:"🚫", title:"Doesn't Pencil as BRRRR", sub:`Negative cash flow after refi. Revisit the numbers — purchase price, rehab budget, rents, or exit cap.`, cls:"red", border:"rgba(242,92,92,0.2)", bg:"rgba(242,92,92,0.06)" };
  };
  const verdict = getVerdict();

  // ── Deal Thesis Hint — debounced fetch on calc changes ─────────
  // Fires 600ms after calc settles, prevents spamming Anthropic while user types.
  useEffect(() => {
    if (!calc || !verdict) { setAiThesis(null); return; }
    const handle = setTimeout(() => {
      fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "deal-thesis",
          strategy: "BRRRR",
          address: form.address,
          verdict: verdict.title,
          metrics: {
            totalCashIn:     calc.totalCashIn,
            cashLeftInDeal:  calc.cashLeftInDeal,
            cashPulledOut:   calc.cashPulledOut,
            isTrueBRRRR:     calc.isTrueBRRRR,
            noi:             calc.noi,
            monthlyCF:       calc.monthlyCF,
            dscr:            calc.dscr,
            coc:             calc.coc === Infinity ? null : calc.coc,
            equityCreated:   calc.equityCreated,
            equityOnCost:    calc.equityOnCost,
            refiCap:         calc.refiCap,
            irr:             calc.irr === Infinity ? null : calc.irr,
            eqMultiple:      calc.eqMultiple === Infinity ? null : calc.eqMultiple,
          },
        }),
      })
        .then(r => {
          if (!r.ok) { console.warn("[brrrr/ai-thesis] fetch failed:", r.status); return null; }
          return r.json();
        })
        .then(t => { if (t?.thesis) setAiThesis(t); })
        .catch(e => { if (e.name !== "AbortError") console.warn("[brrrr/ai-thesis] error:", e.message); });
    }, 600);
    return () => clearTimeout(handle);
  }, [calc?.totalCashIn, calc?.dscr, calc?.cashLeftInDeal, calc?.isTrueBRRRR, calc?.monthlyCF, calc?.irr, verdict?.title, form.address]);

  return (
    <div className="br-wrap">
      <style>{CSS}</style>

      <TopNav />

      {/* Hero */}
      <div className="br-hero">
        <div className="br-hero-glow" />
        <div className="br-hero-tag">Strategy Calculator</div>
        <h1>The <span>BRRRR</span> Calculator</h1>
        <p>Model your Buy, Rehab, Rent, Refinance, Repeat strategy. See if you get all your money back — and what the property cash flows after.</p>
        <div className="br-letters">
          {[["B","Buy"],["R","Rehab"],["R","Rent"],["R","Refinance"],["R","Repeat"]].map(([l,s])=>(
            <div key={s} className="br-letter-pill"><strong>{l}</strong><span>{s}</span></div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="br-body">

        {/* ── LEFT: Inputs ── */}
        <div>
          {/* Try Sample Deal — activation primer */}
          <div style={{
            background:"linear-gradient(135deg, rgba(52,217,138,0.08), rgba(59,158,255,0.06))",
            border:"1px solid rgba(52,217,138,0.25)",
            borderRadius:"var(--r-md,6px)",
            padding:"12px 14px",marginBottom:14,
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:12
          }}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,color:"var(--green)",letterSpacing:"0.7px",marginBottom:3}}>
                ▸ NEW HERE? TRY A SAMPLE
              </div>
              <div style={{fontSize:12.5,color:"var(--text)",lineHeight:1.4}}>
                Calgary triplex BRRRR · pre-filled · see the full memo in 5 seconds
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(prev => ({
                  ...prev,
                  dealName: "Sample · 142 Birchwood Triplex",
                  address: "142 Birchwood Dr, Calgary, AB",
                  purchasePrice: "525000", closingCostsPct: "2",
                  rehabBudget: "85000", holdingMonths: "4", monthlyHoldingCost: "1800",
                  monthlyRent: "5400", vacancyPct: "5", otherIncome: "0",
                  propTax: "4200", insurance: "2400",
                  managementPct: "8", maintenancePct: "5", utilities: "0",
                  arv: "780000",
                  refinanceLTV: "80", refiRate: "5.75", refiAmort: "30", refiClosingCostsPct: "1.5",
                  holdYears: "5", rentGrowth: "3", opexGrowth: "2", appreciation: "3", exitSellingPct: "5",
                }));
                setTimeout(() => window.scrollTo({top: window.scrollY + 400, behavior: "smooth"}), 80);
              }}
              style={{
                fontFamily:"'Geist Mono',monospace",fontSize:11,fontWeight:700,letterSpacing:"0.6px",
                padding:"8px 14px",border:"1px solid var(--green)",borderRadius:"var(--r-sm,4px)",
                color:"#ffffff",background:"var(--green)",cursor:"pointer",whiteSpace:"nowrap",
                transition:"all 0.15s"
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = ""}>
              ▶ LOAD SAMPLE
            </button>
          </div>

          {/* Deal Info */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(59,158,255,0.12)",color:"var(--blue)"}}>📋</div>
              <div><div className="br-card-title">Deal Info</div><div className="br-card-sub">Name &amp; address for saving</div></div>
            </div>
            <div className="br-card-body">
              {xrayPrefill && (
                <XrayPrefillBanner
                  data={xrayPrefill}
                  onClear={() => { clearXrayPrefill(); setXrayPrefill(null); }}
                />
              )}
              <div className="br-field">
                <div className="br-label">Deal Name</div>
                <input className="br-input" type="text" placeholder="e.g. 142 Birchwood — BRRRR" value={form.dealName} onChange={e=>setF("dealName",e.target.value)} />
              </div>
              <div className="br-field">
                <div className="br-label">
                  Property Address
                  {(draftStatus === "saving" || lastSavedAt) && (
                    <span style={{
                      marginLeft:10,fontFamily:"'Geist Mono',ui-monospace,monospace",
                      fontSize:10,fontWeight:600,color:"var(--dim)",letterSpacing:"0.3px",
                    }}>
                      {draftStatus === "saving" ? "▸ saving…" : `▸ auto-saved`}
                    </span>
                  )}
                </div>
                <AddressAutocomplete
                  className="br-input"
                  placeholder="Start typing — Calgary, Edmonton, Toronto..."
                  value={form.address}
                  onChange={v => setF("address", v)}
                  onSelect={v => setF("address", v)}
                />
              </div>
            </div>

            {/* ── Unified address-context card — replaces the earlier
                separate AddressAutoFillBanner + SmartDefaults inline card. */}
            {form.address && (() => {
              const d = getSmartDefaults(form.address, "brrrr");
              const cityLabel = d._smartDefaults.city === "default"
                ? "Canadian"
                : d._smartDefaults.city.charAt(0).toUpperCase() + d._smartDefaults.city.slice(1);
              return (
                <AddressContextCard
                  address={form.address}
                  strategy="brrrr"
                  lookup={autoLookup}
                  patch={autoPatch}
                  onApplyLookup={() => setForm(prev => ({ ...prev, ...autoPatch }))}
                  defaults={{
                    cityLabel,
                    previewText: `${d.vacancyPct}% vacancy · ${d.propTaxRatePct}% property tax · ${d.refiLTV}% refi LTV · ${d._smartDefaults.targetCapPct.toFixed(1)}% target cap`,
                  }}
                  onApplyDefaults={() => setForm(p => ({
                    ...p,
                    vacancyPct:      d.vacancyPct,
                    managementPct:   "8",
                    maintenancePct:  "5",
                    refinanceLTV:    String(d.refiLTV),
                    refiRate:        String(d.refiInterestPct),
                    refiAmort:       String(d.refiAmortYears),
                    closingCostsPct: "2",
                    holdingMonths:   String(d.seasoningMonths),
                  }))}
                />
              );
            })()}

            {/* ── Auto-suggest comparable past deals ──
                When user enters an address that matches city + price band of
                their saved BRRRR deals, surface 1-3 with a "Load values" CTA. */}
            <SimilarDealsHint
              address={form.address}
              strategy="brrrr"
              purchasePrice={Number(form.purchasePrice) || null}
              onApply={(deal) => {
                // Merge the past deal's inputs back into the form, but PRESERVE
                // the user's currently-typed address.
                const inputs = deal.inputs || {};
                const currentAddr = form.address;
                setForm(prev => ({
                  ...prev,
                  ...inputs,
                  address: currentAddr || inputs.address || prev.address,
                  dealName: prev.dealName, // keep their deal name fresh
                }));
              }}
            />

            {/* ── Restored-from-draft banner ── shown for the first 30s after
                the form restored an auto-saved draft. Gives the user a
                one-click "Start fresh" escape hatch. */}
            {restoredAt && (
              <div style={{
                marginTop:10,padding:"9px 13px",
                background:"rgba(33,85,205,0.06)",
                border:"1px solid rgba(33,85,205,0.3)",
                borderLeft:"3px solid #2155cd",
                borderRadius:5,
                display:"flex",alignItems:"center",justifyContent:"space-between",
                gap:12,flexWrap:"wrap",
              }}>
                <div style={{fontSize:12.5,color:"var(--sub)",lineHeight:1.5,flex:1,minWidth:200}}>
                  <strong style={{color:"#2155cd",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"0.3px"}}>▸ RESUMED YOUR DRAFT</strong>{" "}
                  from {new Date(restoredAt).toLocaleString("en-CA", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })} —
                  your changes auto-save as you go.
                </div>
                <button
                  onClick={() => { clearDraft(); window.location.reload(); }}
                  style={{
                    background:"transparent",color:"var(--sub)",border:"1px solid var(--borderf)",
                    borderRadius:4,padding:"6px 12px",
                    fontFamily:"'Geist Mono',ui-monospace,monospace",
                    fontSize:10.5,fontWeight:700,letterSpacing:"0.5px",cursor:"pointer",
                    textTransform:"uppercase",flexShrink:0,
                  }}
                >
                  ↻ Start fresh
                </button>
              </div>
            )}

          </div>

          {/* Drop a PDF, autofill the form — Scale tier */}
          <TierGate
            tier="scale"
            feature="AI Document Drop"
            description="Drop a listing sheet, rent roll, lease, or appraisal — our AI reads it and the calculator fills in. Saves 5-10 minutes of typing per deal."
          >
            <AIDocumentDrop
              target="residential"
              onApply={({ field, value }) => {
                const map = {
                  address:        "address",
                  purchasePrice:  "purchasePrice",
                  // Appraisals don't have a purchase price — fall back to the
                  // appraised value if the user hasn't entered one yet.
                  appraisedValue: form.purchasePrice ? null : "purchasePrice",
                  arv:            "arv",
                  repairCosts:    "rehabBudget",
                  monthlyRent:    "monthlyRent",
                  propertyTaxes:  "propTax",
                };
                const k = map[field];
                if (!k) return;
                // Taxes from doc are usually annual; BRRRR wants monthly
                const v = (k === "propTax") ? Math.round(Number(value) / 12) : value;
                setF(k, String(v));
              }}
            />
          </TierGate>

          {/* Loss-to-Lease — rent roll → CMHC delta → upside */}
          <TierGate
            tier="scale"
            feature="Loss-to-Lease Analyzer"
            description="Drop a rent roll. We extract every unit row, cross-reference each against CMHC market rent, and show you the stranded upside in dollars per door per year."
          >
            <div style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px", marginTop:12,
              background:"linear-gradient(180deg,rgba(212,175,55,0.05),rgba(0,102,204,0.04))",
              border:"1px solid rgba(212,175,55,0.32)",
              borderLeft:"3px solid var(--gold)",
              borderRadius:6, cursor:"pointer",
            }}
              onClick={() => document.getElementById("ltl-brrrr-input")?.click()}
            >
              <div style={{fontSize:24}}>📊</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:11,fontWeight:700,letterSpacing:"1.2px",color:"var(--gold)",textTransform:"uppercase",marginBottom:3}}>
                  Loss-to-Lease Analyzer
                </div>
                <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>
                  {ltlLoading
                    ? "Reading rent roll · cross-referencing CMHC · computing per-door upside…"
                    : ltlError
                      ? <span style={{color:"var(--red)"}}>⚠ {ltlError}</span>
                      : ltlData?.ok
                        ? <span style={{color:"var(--green)"}}>✓ Analyzed — see panel below</span>
                        : <>Drop a <strong>rent roll PDF</strong> · we'll find the stranded upside</>}
                </div>
              </div>
              <input
                type="file"
                id="ltl-brrrr-input"
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
          </TierGate>

          {/* Live zoning + assessment + permits + AI thesis (Edmonton + Calgary) */}
          <PropertyIntelCard address={form.address} />

          {/* Simple / Advanced mode toggle */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:10, padding:"10px 14px", marginBottom:10,
            background:"var(--card)", border:"1px solid var(--borderf)", borderRadius:6,
            borderLeft:`3px solid ${simpleMode ? "var(--green)" : "var(--blue)"}`,
          }}>
            <div>
              <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,color:simpleMode?"var(--green)":"var(--blue)",letterSpacing:"1.2px"}}>
                ▸ {simpleMode ? "ESSENTIALS ONLY" : "ADVANCED · ALL INPUTS"}
              </div>
              <div style={{fontSize:11.5,color:"var(--sub)",marginTop:2}}>
                {simpleMode
                  ? "5 fields. Sensible defaults for closing, refi, taxes, insurance, holding."
                  : "Every input. Tune any assumption — phases 1-5 below."}
              </div>
            </div>
            <button
              onClick={toggleSimpleMode}
              style={{
                background:"transparent", border:`1px solid var(--borderf)`, borderRadius:5,
                padding:"7px 14px", fontFamily:"'Geist Mono',ui-monospace,monospace",
                fontSize:10.5, fontWeight:700, color:"var(--text)", letterSpacing:"1px",
                cursor:"pointer", transition:"border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "rgba(59,158,255,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--borderf)"; e.currentTarget.style.background = "transparent"; }}
            >
              {simpleMode ? "SHOW ALL INPUTS →" : "← BACK TO ESSENTIALS"}
            </button>
          </div>

          {/* ─── ESSENTIALS-ONLY CARD ────────────────────────────────────────── */}
          {simpleMode && (
            <div className="br-card">
              <div className="br-card-header">
                <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>⚡</div>
                <div>
                  <div className="br-card-title">The 5 inputs that matter</div>
                  <div className="br-card-sub">Address is above. Everything else uses smart defaults.</div>
                </div>
              </div>
              <div className="br-card-body">
                <div className="br-row2">
                  <div className="br-field">
                    <div className="br-label">Purchase Price</div>
                    <input className="br-input" type="number" placeholder="350,000" value={form.purchasePrice} onChange={e=>setF("purchasePrice",e.target.value)} />
                  </div>
                  <div className="br-field">
                    <div className="br-label">Rehab Budget</div>
                    <input className="br-input" type="number" placeholder="45,000" value={form.rehabBudget} onChange={e=>setF("rehabBudget",e.target.value)} />
                  </div>
                </div>
                <div className="br-row2">
                  <div className="br-field">
                    <div className="br-label">ARV (after-repair value)</div>
                    <input className="br-input" type="number" placeholder="500,000" value={form.arv} onChange={e=>setF("arv",e.target.value)} />
                  </div>
                  <div className="br-field">
                    <div className="br-label">Monthly Rent (stabilized)</div>
                    <input className="br-input" type="number" placeholder="2,400" value={form.monthlyRent} onChange={e=>setF("monthlyRent",e.target.value)} />
                  </div>
                </div>
                <div style={{
                  marginTop:14, padding:"10px 12px",
                  background:"rgba(59,158,255,0.05)", border:"1px solid rgba(59,158,255,0.15)",
                  borderRadius:4, fontSize:11.5, color:"var(--sub)", lineHeight:1.55,
                }}>
                  <strong style={{color:"var(--blue)"}}>Smart defaults applied:</strong> 80% LTV refi at 5.75% / 25yr, 5% vacancy, 8% management,
                  5% maintenance, 2% closing, 1.5% refi closing, 3% rent growth, 5-yr hold. Click "Show all inputs" to tune any of them.
                </div>
              </div>
            </div>
          )}

          {/* Phases 1-5 — advanced inputs (hidden in Essentials mode) */}
          {!simpleMode && (
          <>
          {/* Phase 1: Buy */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(59,158,255,0.12)",color:"var(--blue)"}}>1️⃣</div>
              <div><div className="br-card-title">Buy</div><div className="br-card-sub">Acquisition costs</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-field">
                <div className="br-label">Purchase Price</div>
                <input className="br-input" type="number" placeholder="350,000" value={form.purchasePrice} onChange={e=>setF("purchasePrice",e.target.value)} />
              </div>
              <div className="br-field">
                <div className="br-label">
                  Closing Costs %
                  {calc && calc.pp > 0 && <span className="br-hint">→ {fmt(calc.closingCostsBuy)}</span>}
                </div>
                <input className="br-input" type="number" placeholder="2" value={form.closingCostsPct} onChange={e=>setF("closingCostsPct",e.target.value)} />
              </div>
            </div>
          </div>

          {/* Phase 2: Rehab */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(240,160,48,0.12)",color:"var(--amber)"}}>2️⃣</div>
              <div><div className="br-card-title">Rehab</div><div className="br-card-sub">Renovation + holding costs</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-field">
                <div className="br-label">Rehab / Renovation Budget</div>
                <input className="br-input" type="number" placeholder="60,000" value={form.rehabBudget} onChange={e=>setF("rehabBudget",e.target.value)} />
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Hold Period (months)</div>
                  <input className="br-input" type="number" placeholder="3" value={form.holdingMonths} onChange={e=>setF("holdingMonths",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Monthly Holding Cost
                    {calc && calc.holdingCost > 0 && <span className="br-hint amber">→ {fmt(calc.holdingCost)}</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="1,200" value={form.monthlyHoldingCost} onChange={e=>setF("monthlyHoldingCost",e.target.value)} />
                </div>
              </div>
              {calc && calc.totalCashIn > 0 && (
                <div style={{background:"rgba(240,160,48,0.06)",border:"1px solid rgba(240,160,48,0.18)",borderRadius: 10,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--amber)",fontWeight:600}}>
                  <span>Total cash into deal</span>
                  <span style={{fontFamily:"'Geist Mono',monospace"}}>{fmt(calc.totalCashIn)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 3: Rent */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>3️⃣</div>
              <div><div className="br-card-title">Rent</div><div className="br-card-sub">Stabilized rental income &amp; expenses</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>Monthly Rent</span>
                    {isCanadian(form.address) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.address) return;
                          setRentPredicting(true);
                          try {
                            const r = await fetch("/api/predict-rent", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ address: form.address, bedrooms: predictBeds }),
                            });
                            const data = r.ok ? await r.json() : null;
                            if (data?.ok) {
                              setRentPrediction(data);
                              setF("monthlyRent", String(data.predictedRent));
                            }
                          } catch {}
                          setRentPredicting(false);
                        }}
                        disabled={!form.address || rentPredicting}
                        style={{
                          fontSize:9.5, fontFamily:"'Geist Mono',monospace", fontWeight:700,
                          letterSpacing:"0.5px", padding:"3px 7px",
                          border:"1px solid rgba(167,130,255,0.4)", borderRadius:"var(--r-xs,2px)",
                          color: rentPredicting ? "var(--dim)" : "var(--purple)",
                          background:"rgba(167,130,255,0.08)", cursor: rentPredicting?"wait":"pointer",
                          opacity: form.address ? 1 : 0.4
                        }}>
                        {rentPredicting ? "..." : "🇨🇦 ESTIMATE"}
                      </button>
                    )}
                  </div>
                  <input className="br-input" type="number" placeholder="2,400" value={form.monthlyRent} onChange={e=>{setF("monthlyRent",e.target.value); setRentPrediction(null);}} />
                  {rentPrediction && (
                    <div style={{
                      marginTop:6, padding:"6px 9px",
                      background:"rgba(167,130,255,0.06)",
                      border:"1px solid rgba(167,130,255,0.2)",
                      borderRadius:"var(--r-sm,4px)",
                      fontFamily:"'Geist Mono',monospace", fontSize:10, color:"var(--sub)"
                    }}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                        <span style={{color:"var(--purple)",fontWeight:700,letterSpacing:"0.4px"}}>CMHC · {rentPrediction.unitType?.toUpperCase()}</span>
                        <span>{fmt(rentPrediction.range.low)}–{fmt(rentPrediction.range.high)} ±{rentPrediction.range.spreadPct}%</span>
                      </div>
                      <div style={{marginTop:5,display:"flex",gap:4}}>
                        {[{b:0,l:"Bach"},{b:1,l:"1BR"},{b:2,l:"2BR"},{b:3,l:"3BR+"}].map(({b,l}) => (
                          <button key={b} type="button"
                            onClick={async () => {
                              setPredictBeds(b);
                              setRentPredicting(true);
                              try {
                                const r = await fetch("/api/predict-rent", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ address: form.address, bedrooms: b }),
                                });
                                const data = r.ok ? await r.json() : null;
                                if (data?.ok) {
                                  setRentPrediction(data);
                                  setF("monthlyRent", String(data.predictedRent));
                                }
                              } catch {}
                              setRentPredicting(false);
                            }}
                            style={{
                              flex:1, padding:"2px 0", fontSize:9.5, fontWeight:700,
                              border: `1px solid ${predictBeds===b?"var(--purple)":"var(--borderf)"}`,
                              borderRadius:"var(--r-xs,2px)",
                              background: predictBeds===b ? "rgba(167,130,255,0.15)" : "transparent",
                              color: predictBeds===b ? "var(--purple)" : "var(--dim)",
                              cursor:"pointer", fontFamily:"'Geist Mono',monospace"
                            }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Vacancy %
                    {calc && calc.vacancyLoss > 0 && <span className="br-hint amber">→ {fmt(calc.vacancyLoss)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="5" value={form.vacancyPct} onChange={e=>setF("vacancyPct",e.target.value)} />
                </div>
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Property Tax/yr</div>
                  <input className="br-input" type="number" placeholder="4,200" value={form.propTax} onChange={e=>setF("propTax",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Insurance/yr</div>
                  <input className="br-input" type="number" placeholder="2,400" value={form.insurance} onChange={e=>setF("insurance",e.target.value)} />
                </div>
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">
                    Management %
                    {calc && calc.management > 0 && <span className="br-hint">→ {fmt(calc.management)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="8" value={form.managementPct} onChange={e=>setF("managementPct",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Maintenance %
                    {calc && calc.maintenance > 0 && <span className="br-hint">→ {fmt(calc.maintenance)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="5" value={form.maintenancePct} onChange={e=>setF("maintenancePct",e.target.value)} />
                </div>
              </div>
              {calc && calc.noi !== 0 && (
                <div style={{background:"rgba(52,217,138,0.06)",border:"1px solid rgba(52,217,138,0.18)",borderRadius: 10,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--green)",fontWeight:600}}>
                  <span>Stabilized NOI</span>
                  <span style={{fontFamily:"'Geist Mono',monospace"}}>{fmt(calc.noi)}/yr · Cap {fmtPct(calc.entryCap)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 4: Refinance */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(167,130,255,0.12)",color:"var(--purple)"}}>4️⃣</div>
              <div><div className="br-card-title">Refinance</div><div className="br-card-sub">After-repair value &amp; new mortgage</div></div>
            </div>
            <div className="br-card-body">
              {/* Bank Rate Banner */}
              <a href="https://www.bankofcanada.ca/rates/interest-rates/canadian-interest-rates/" target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",gap:10,background:"rgba(167,130,255,0.06)",border:"1px solid rgba(167,130,255,0.2)",borderRadius: 10,padding:"9px 12px",textDecoration:"none",marginBottom:2}}>
                <span style={{fontSize:18}}>🏦</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"var(--purple)"}}>Check current bank rates</div>
                  <div style={{fontSize:10.5,color:"var(--sub)"}}>Canadian 5-yr insured ~4.89% · Uninsured ~5.14% · Click to view Bank of Canada rates →</div>
                </div>
              </a>
              <div className="br-field">
                <div className="br-label">After-Repair Value (ARV)</div>
                <input className="br-input" type="number" placeholder="500,000" value={form.arv} onChange={e=>setF("arv",e.target.value)} />
              </div>
              <div className="br-row3">
                <div className="br-field">
                  <div className="br-label">
                    LTV %
                    {calc && calc.refiLoanAmount > 0 && <span className="br-hint">→ {fmt(calc.refiLoanAmount)}</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="80" value={form.refinanceLTV} onChange={e=>setF("refinanceLTV",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Rate %</div>
                  <input className="br-input" type="number" placeholder="5.75" value={form.refiRate} onChange={e=>setF("refiRate",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Amort (yrs)</div>
                  <input className="br-input" type="number" placeholder="25" value={form.refiAmort} onChange={e=>setF("refiAmort",e.target.value)} />
                </div>
              </div>
              <div className="br-field">
                <div className="br-label">
                  Refi Closing Costs %
                  {calc && calc.refiClosingCosts > 0 && <span className="br-hint amber">→ {fmt(calc.refiClosingCosts)}</span>}
                </div>
                <input className="br-input" type="number" placeholder="1.5" value={form.refiClosingCostsPct} onChange={e=>setF("refiClosingCostsPct",e.target.value)} />
              </div>
              {calc && calc.refiNetProceeds > 0 && (
                <div style={{background:"rgba(167,130,255,0.06)",border:"1px solid rgba(167,130,255,0.2)",borderRadius: 10,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--purple)",fontWeight:600}}>
                  <span>Net refi proceeds</span>
                  <span style={{fontFamily:"'Geist Mono',monospace"}}>{fmt(calc.refiNetProceeds)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 5: Hold + Exit */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>5️⃣</div>
              <div><div className="br-card-title">Hold &amp; Exit</div><div className="br-card-sub">Post-refi projection assumptions</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Hold Period (years)</div>
                  <input className="br-input" type="number" placeholder="5" value={form.holdYears} onChange={e=>setF("holdYears",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Rent Growth %/yr</div>
                  <input className="br-input" type="number" placeholder="3" value={form.rentGrowth} onChange={e=>setF("rentGrowth",e.target.value)} />
                </div>
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">OpEx Growth %/yr</div>
                  <input className="br-input" type="number" placeholder="2" value={form.opexGrowth} onChange={e=>setF("opexGrowth",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Appreciation %/yr</div>
                  <input className="br-input" type="number" placeholder="3" value={form.appreciation} onChange={e=>setF("appreciation",e.target.value)} />
                </div>
              </div>
              <div className="br-field">
                <div className="br-label">
                  Selling Costs at Exit %
                  {calc && calc.exitSellCosts > 0 && <span className="br-hint">→ {fmt(calc.exitSellCosts)}</span>}
                </div>
                <input className="br-input" type="number" placeholder="5" value={form.exitSellingPct} onChange={e=>setF("exitSellingPct",e.target.value)} />
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          {!hasData ? (
            <div className="br-placeholder">
              <div className="br-placeholder-icon">🔄</div>
              <div className="br-placeholder-title">Results appear here</div>
              <div className="br-placeholder-sub">Fill in your purchase price, rehab budget, rents, and ARV to see whether this deal works as a BRRRR.</div>
            </div>
          ) : verdict && (<>

            {/* ── TL;DR: big verdict + 3 key numbers ─────────────────────────── */}
            <div className="br-card" style={{marginBottom:10}}>
              <div className="br-card-body">
                <div style={{background:verdict.bg,border:`1px solid ${verdict.border}`,borderLeft:`4px solid var(--${verdict.cls})`,borderRadius:6,padding:"18px 20px"}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:4}}>
                    <span style={{fontSize:28,lineHeight:1}}>{verdict.icon}</span>
                    <span style={{fontFamily:"'Geist',sans-serif",fontSize:24,fontWeight:800,color:`var(--${verdict.cls})`,letterSpacing:"-0.4px"}}>
                      {verdict.title}
                    </span>
                  </div>
                  <div style={{fontFamily:"'Geist',sans-serif",fontSize:14,color:"var(--sub)",lineHeight:1.5,marginBottom:16}}>
                    {verdict.sub}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8}}>
                    {[
                      {
                        lbl: "Monthly Cash Flow",
                        val: fmt(calc.monthlyCF),
                        good: calc.monthlyCF >= 200,
                        warn: calc.monthlyCF >= 0 && calc.monthlyCF < 200,
                      },
                      {
                        lbl: "DSCR",
                        val: calc.dscr ? fmtX(calc.dscr) : "—",
                        good: calc.dscr >= 1.25,
                        warn: calc.dscr >= 1.0 && calc.dscr < 1.25,
                      },
                      {
                        lbl: "Cash Pulled Out",
                        val: fmt(calc.cashPulledOut),
                        good: calc.isTrueBRRRR,
                        warn: calc.cashLeftInDeal > 0 && calc.cashLeftInDeal <= 10000,
                      },
                    ].map(m => {
                      const c = m.good ? "var(--green)" : m.warn ? "var(--amber)" : "var(--red)";
                      return (
                        <div key={m.lbl} style={{
                          background:"rgba(15,23,42,0.025)", border:"1px solid var(--borderf)",
                          borderRadius:4, padding:"10px 12px", textAlign:"center",
                        }}>
                          <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:9,fontWeight:700,color:"var(--dim)",letterSpacing:"0.8px",textTransform:"uppercase",marginBottom:3}}>
                            {m.lbl}
                          </div>
                          <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:20,fontWeight:700,color:c,letterSpacing:"-0.4px",lineHeight:1.1}}>
                            {m.val}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {aiThesis?.thesis && (
                  <div style={{
                    marginTop:10,padding:"10px 12px",
                    background:"rgba(52,217,138,0.05)",
                    borderLeft:"3px solid var(--green)",
                    borderRadius:"0 var(--r-sm,4px) var(--r-sm,4px) 0",
                    display:"flex",gap:10,alignItems:"flex-start"
                  }}>
                    <span style={{fontSize:14,lineHeight:1.4}}>🤖</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,color:"var(--green)",letterSpacing:"0.7px",marginBottom:3}}>
                        BUDDY READ{aiThesis.source !== "template" && <span style={{color:"var(--dim)",fontWeight:500,marginLeft:6}}>· {aiThesis.source}</span>}
                      </div>
                      <div style={{fontSize:12.5,color:"var(--text)",lineHeight:1.55}}>
                        {aiThesis.thesis}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Deal Red Flags ─────────────────────────────────────────── */}
            {(() => {
              const flags = [];
              if (calc.monthlyCF < 0)
                flags.push({ sev:"critical", msg:`Monthly cash flow is negative (${fmt(calc.monthlyCF)}/mo) after refi. The rental income doesn't cover all expenses + mortgage.` });
              if (calc.dscr < 1.0 && calc.dscr > 0)
                flags.push({ sev:"critical", msg:`DSCR is ${fmtX(calc.dscr)} — below 1.0x. Rent can't cover the refi mortgage. Lenders require ≥ 1.25x.` });
              else if (calc.dscr < 1.25 && calc.dscr >= 1.0)
                flags.push({ sev:"warning", msg:`DSCR is ${fmtX(calc.dscr)} — below the typical lender minimum of 1.25x. May not qualify for a refi.` });
              if (!calc.isTrueBRRRR && calc.cashLeftInDeal > 0)
                flags.push({ sev:"warning", msg:`${fmt(calc.cashLeftInDeal)} left in the deal after refi. True BRRRR requires pulling all your cash back out.` });
              if (calc.refiCap < 0.05 && calc.refiCap > 0)
                flags.push({ sev:"warning", msg:`Cap rate on ARV is only ${fmtPct(calc.refiCap)} — below 5%. Thin margin against rising vacancies or expenses.` });
              if (!flags.length) return null;
              return (
                <div style={{marginBottom:16,borderRadius: 16,overflow:"hidden",border:"1px solid rgba(242,92,92,0.2)",background:"rgba(242,92,92,0.03)"}}>
                  <div style={{padding:"11px 18px",borderBottom:"1px solid rgba(242,92,92,0.12)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>⚠️</span>
                    <span style={{fontSize:13,fontWeight:800,color:"var(--red)"}}>Deal Red Flags — {flags.length} issue{flags.length>1?"s":""} detected</span>
                  </div>
                  {flags.map((f,i) => (
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 18px",borderBottom:i<flags.length-1?"1px solid rgba(15,23,42,0.04)":"none"}}>
                      <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{f.sev==="critical"?"🚨":"⚠️"}</span>
                      <span style={{fontSize:13,color:f.sev==="critical"?"var(--red)":"var(--amber)",lineHeight:1.5}}>{f.msg}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Key metrics */}
            <div className="br-card">
              <div className="br-card-header">
                <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>📊</div>
                <div><div className="br-card-title">Post-Refi Performance</div></div>
              </div>
              <div className="br-card-body">
                <div className="br-result-grid">
                  <div className={`br-metric ${calc.monthlyCF>=0?"green":"red"}`}>
                    <div className="br-metric-label">Monthly Cash Flow</div>
                    <div className="br-metric-val">{fmt(calc.monthlyCF)}</div>
                    <div className="br-metric-sub">After all expenses + new mortgage</div>
                  </div>
                  <div className={`br-metric ${calc.dscr>=1.25?"green":calc.dscr>=1?"amber":"red"}`}>
                    <div className="br-metric-label">DSCR <MetricTip metric="dscr" /></div>
                    <div className="br-metric-val">{fmtX(calc.dscr)}</div>
                    <div className="br-metric-sub">NOI ÷ debt service · need ≥1.25</div>
                    <MetricWarning metric="dscr" value={calc.dscr} compact />
                  </div>
                  <div className={`br-metric ${calc.isTrueBRRRR?"purple":"blue"}`}>
                    <div className="br-metric-label">{calc.isTrueBRRRR ? "Cash Pulled Out" : "Cash Left In Deal"} <MetricTip metric="ltv" /></div>
                    <div className="br-metric-val">{calc.isTrueBRRRR ? fmt(calc.cashPulledOut) : fmt(calc.cashLeftInDeal)}</div>
                    <div className="br-metric-sub">{calc.isTrueBRRRR ? "Recycled to next deal" : "Equity still in property"}</div>
                  </div>
                  <div className={`br-metric ${calc.coc===Infinity||calc.coc>=0.10?"green":calc.coc>=0.06?"amber":"red"}`}>
                    <div className="br-metric-label">Cash-on-Cash <MetricTip metric="coc" strategy="brrrr" /></div>
                    <div className="br-metric-val">{calc.coc===Infinity?"∞":fmtPct(calc.coc)}</div>
                    <div className="br-metric-sub">{calc.isTrueBRRRR?"Infinite — no money left in":"Annual CF ÷ cash remaining"}</div>
                    {calc.coc !== Infinity && <MetricWarning metric="coc" value={calc.coc} ctx={{ strategy: "brrrr" }} compact />}
                  </div>
                  <div className="br-metric blue">
                    <div className="br-metric-label">New Monthly Payment</div>
                    <div className="br-metric-val">{fmt(calc.refiMonthlyPayment)}</div>
                    <div className="br-metric-sub">Post-refi mortgage P+I</div>
                  </div>
                  <div className={`br-metric ${calc.refiCap>=0.07?"green":calc.refiCap>=0.05?"amber":"red"}`}>
                    <div className="br-metric-label">Cap Rate on ARV</div>
                    <div className="br-metric-val">{fmtPct(calc.refiCap)}</div>
                    <div className="br-metric-sub">NOI ÷ ARV · target ≥7%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Equity created */}
            <div className="br-card">
              <div className="br-card-header">
                <div className="br-card-icon" style={{background:"rgba(167,130,255,0.12)",color:"var(--purple)"}}>💎</div>
                <div><div className="br-card-title">Equity Created</div><div className="br-card-sub">Forced appreciation through rehab</div></div>
              </div>
              <div className="br-card-body">
                <div className="br-result-grid">
                  <div className={`br-metric ${calc.equityCreated>0?"purple":"red"}`}>
                    <div className="br-metric-label">Equity Created</div>
                    <div className="br-metric-val">{fmt(calc.equityCreated)}</div>
                    <div className="br-metric-sub">ARV − total cash invested</div>
                  </div>
                  <div className={`br-metric ${calc.equityOnCost>=0.20?"green":calc.equityOnCost>=0.10?"amber":"red"}`}>
                    <div className="br-metric-label">Return on Cost</div>
                    <div className="br-metric-val">{fmtPct(calc.equityOnCost)}</div>
                    <div className="br-metric-sub">Equity gain ÷ cash invested</div>
                  </div>
                </div>
                {/* Cash waterfall */}
                <div className="br-waterfall">
                  <div className="br-waterfall-title">Cash Flow Summary</div>
                  <div className="br-wf-row"><span className="br-wf-label">Purchase price</span><span className="br-wf-val neg">({fmt(calc.pp)})</span></div>
                  <div className="br-wf-row"><span className="br-wf-label">Closing costs (buy)</span><span className="br-wf-val neg">({fmt(calc.closingCostsBuy)})</span></div>
                  {calc.rehab>0&&<div className="br-wf-row"><span className="br-wf-label">Rehab budget</span><span className="br-wf-val neg">({fmt(calc.rehab)})</span></div>}
                  {calc.holdingCost>0&&<div className="br-wf-row"><span className="br-wf-label">Holding costs</span><span className="br-wf-val neg">({fmt(calc.holdingCost)})</span></div>}
                  <div className="br-wf-row"><span className="br-wf-label" style={{fontWeight:600,color:"var(--text)"}}>Total cash invested</span><span className="br-wf-val neg" style={{fontWeight:700}}>({fmt(calc.totalCashIn)})</span></div>
                  <div className="br-wf-row"><span className="br-wf-label">Refi loan ({form.refinanceLTV}% of ARV)</span><span className="br-wf-val purple">{fmt(calc.refiLoanAmount)}</span></div>
                  {calc.refiClosingCosts>0&&<div className="br-wf-row"><span className="br-wf-label">Less: refi closing costs</span><span className="br-wf-val neg">({fmt(calc.refiClosingCosts)})</span></div>}
                  <div className="br-wf-row">
                    <span className="br-wf-label" style={{fontWeight:700,color:calc.isTrueBRRRR?"var(--green)":"var(--blue)"}}>
                      {calc.isTrueBRRRR ? "✓ Cash pulled out of deal" : "Cash still left in deal"}
                    </span>
                    <span className={`br-wf-val ${calc.isTrueBRRRR?"pos":"purple"}`} style={{fontWeight:700}}>
                      {calc.isTrueBRRRR ? fmt(calc.cashPulledOut) : fmt(calc.cashLeftInDeal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Hold + Exit Returns ─────────────────────────────────────────── */}
            <div className="br-card" style={{borderRadius:6,borderColor:"rgba(52,217,138,0.18)"}}>
              <div className="br-card-header" style={{padding:"10px 14px",background:"rgba(52,217,138,0.04)"}}>
                <div style={{width:30,height:22,border:"1px solid rgba(52,217,138,0.4)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,color:"var(--green)",letterSpacing:"0.5px"}}>RTN</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--green)",fontWeight:700,letterSpacing:"0.5px"}}>[ HOLD/RETURNS ]</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--dim)"}}>· {calc.hold}YR</span>
                  </div>
                  <div className="br-card-title" style={{fontSize:12.5,marginTop:1,letterSpacing:"0.2px"}}>IRR / Equity Multiple / Exit Proceeds</div>
                </div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,color:calc.irr===Infinity||calc.irr>=0.15?"var(--green)":calc.irr>=0.10?"var(--amber)":"var(--red)",fontWeight:700}}>
                  {calc.irr===Infinity?"▲ ∞":calc.irr>=0.15?"▲ STRONG":calc.irr>=0.10?"● HOLD":"▼ REVIEW"}
                </div>
              </div>
              <div className="br-card-body" style={{padding:"12px 14px",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8}}>
                  {[
                    {lbl:"IRR (TRUE)",      val: calc.irr===Infinity?"∞":calc.irr!=null?fmtPct(calc.irr):"—", sub: calc.irr===Infinity?"zero capital left":"NPV across yearly CFs", cls: calc.irr===Infinity?"purple":calc.irr!=null&&calc.irr>=0.15?"green":calc.irr!=null&&calc.irr>=0.10?"amber":"red"},
                    {lbl:"EQUITY MULT",     val: calc.eqMultiple===Infinity?"∞":fmtX(calc.eqMultiple),       sub: calc.eqMultiple===Infinity?"recouped at refi":`÷ ${fmt(calc.cashLeftInDeal)} in`, cls: calc.eqMultiple===Infinity?"purple":calc.eqMultiple>=2?"green":calc.eqMultiple>=1.5?"amber":"red"},
                    {lbl:`EXIT YR${calc.hold}`,val: fmt(calc.exitArv),                                       sub: `ARV·(1+${form.appreciation}%)^${calc.hold}`, cls:"green"},
                    {lbl:"NET PROCEEDS",    val: fmt(calc.exitProceeds),                                     sub: `− ${fmt(calc.refiLoanBal)} loan bal`, cls:"green"},
                    {lbl:"HOLD CF (Σ)",     val: fmt(calc.totalHoldCF),                                      sub: `${form.rentGrowth}% rent g`, cls:"blue"},
                    {lbl:"TOTAL RETURN",    val: fmt(calc.totalReturn),                                      sub: "Hold CF + exit", cls:"blue"},
                  ].map((m,i)=>(
                    <div key={i} className={`br-metric ${m.cls}`} style={{padding:10,borderRadius:4}}>
                      <div className="br-metric-label" style={{fontSize:9,fontFamily:"'Geist Mono',monospace",marginBottom:4,letterSpacing:"0.8px"}}>{m.lbl}</div>
                      <div className="br-metric-val" style={{fontSize:17,fontFamily:"'Geist Mono',monospace",letterSpacing:"-0.3px"}}>{m.val}</div>
                      <div className="br-metric-sub" style={{fontSize:9.5,marginTop:3,fontFamily:"'Geist Mono',monospace"}}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Year-by-Year Projection ──────────────────────────────────────── */}
            <div className="br-card" style={{borderRadius:6,borderColor:"rgba(59,158,255,0.18)"}}>
              <div className="br-card-header" style={{padding:"10px 14px",background:"rgba(59,158,255,0.04)"}}>
                <div style={{width:30,height:22,border:"1px solid rgba(59,158,255,0.4)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,color:"var(--blue)",letterSpacing:"0.5px"}}>P&amp;L</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--blue)",fontWeight:700,letterSpacing:"0.5px"}}>[ PROJECTION ]</span>
                    <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--dim)"}}>· POST-REFI</span>
                  </div>
                  <div className="br-card-title" style={{fontSize:12.5,marginTop:1,letterSpacing:"0.2px"}}>{calc.hold}-Year Cash Flow Schedule</div>
                </div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--dim)"}}>{form.rentGrowth}%·R / {form.opexGrowth}%·OX</div>
              </div>
              <div className="br-card-body" style={{padding:"0",gap:0}}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:Math.max(560, 140 + 80*calc.proj.length),fontFamily:"'Geist Mono',monospace"}}>
                    <thead>
                      <tr style={{color:"var(--dim)",fontSize:9.5,fontWeight:700,letterSpacing:"0.6px",background:"rgba(15,23,42,0.015)"}}>
                        <th style={{textAlign:"left",padding:"8px 14px",borderBottom:"1px solid var(--borderf)"}}>LINE</th>
                        {calc.proj.map(p=><th key={p.yr} style={{textAlign:"right",padding:"8px 10px",borderBottom:"1px solid var(--borderf)"}}>Y{p.yr}</th>)}
                      </tr>
                    </thead>
                    <tbody style={{color:"var(--text)"}}>
                      {[
                        {lbl:"GROSS RENT",   key:"grossYr"},
                        {lbl:"EGI",          key:"egiYr"},
                        {lbl:"OPEX",         key:"opexYr",  neg:true},
                      ].map(({lbl,key,neg},ri)=>(
                        <tr key={lbl} style={{background:ri%2===0?"transparent":"rgba(255,255,255,0.012)"}}>
                          <td style={{padding:"5px 14px",color:"var(--sub)",fontSize:10.5,letterSpacing:"0.4px"}}>{lbl}</td>
                          {calc.proj.map((p,i)=><td key={i} style={{textAlign:"right",padding:"5px 10px",color:neg?"var(--red)":"var(--text)"}}>{neg?`(${fmt(p[key])})`:fmt(p[key])}</td>)}
                        </tr>
                      ))}
                      <tr style={{borderTop:"1px solid rgba(59,158,255,0.2)",fontWeight:700,background:"rgba(59,158,255,0.04)"}}>
                        <td style={{padding:"7px 14px",color:"var(--blue)",fontSize:10.5,letterSpacing:"0.4px"}}>NOI</td>
                        {calc.proj.map((p,i)=><td key={i} style={{textAlign:"right",padding:"7px 10px",color:"var(--blue)"}}>{fmt(p.noiYr)}</td>)}
                      </tr>
                      <tr>
                        <td style={{padding:"5px 14px",color:"var(--sub)",fontSize:10.5,letterSpacing:"0.4px"}}>DEBT SVC</td>
                        {calc.proj.map((p,i)=><td key={i} style={{textAlign:"right",padding:"5px 10px",color:"var(--red)"}}>({fmt(calc.annualDebtService)})</td>)}
                      </tr>
                      <tr style={{borderTop:"1px solid rgba(52,217,138,0.25)",fontWeight:700,background:"rgba(52,217,138,0.05)"}}>
                        <td style={{padding:"8px 14px",color:"var(--green)",fontSize:10.5,letterSpacing:"0.4px"}}>BTCF ▶</td>
                        {calc.proj.map((p,i)=><td key={i} style={{textAlign:"right",padding:"8px 10px",color:p.btcfYr>=0?"var(--green)":"var(--red)"}}>{p.btcfYr>=0?fmt(p.btcfYr):`(${fmt(-p.btcfYr)})`}</td>)}
                      </tr>
                      <tr style={{borderTop:"1px solid var(--borderf)"}}>
                        <td style={{padding:"6px 14px",color:"var(--sub)",fontSize:10.5,letterSpacing:"0.4px"}}>DSCR</td>
                        {calc.proj.map((p,i)=><td key={i} style={{textAlign:"right",padding:"6px 10px",color:p.dscrYr>=1.25?"var(--green)":p.dscrYr>=1?"var(--amber)":"var(--red)"}}>{p.dscrYr>=1.25?"▲ ":p.dscrYr>=1?"● ":"▼ "}{fmtX(p.dscrYr)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Visual Analytics (lazy-loaded — recharts is the heavy dep) ── */}
            <Suspense fallback={
              <div className="br-card" style={{borderRadius:6,padding:"40px 14px",textAlign:"center",display:"flex",justifyContent:"center"}}>
                <BuddyLoading label="loading charts" tone="sub" size="sm" />
              </div>
            }>
              <BRRRRCharts calc={calc} />
            </Suspense>

            {/* ── DealReadout — "your buddy read" — verdict + benchmarks + actions */}
            {calc && calc.dscr != null && (() => {
              const currentMetrics = {
                dscr:     calc.dscr,
                capRate:  calc.entryCap,
                coc:      calc.coc === Infinity ? null : calc.coc,
                irr:      calc.irr,
              };
              const history = compareToHistory(currentMetrics, { strategy: "brrrr" });
              return (
              <div style={{marginTop:18}}>
                <DealReadout
                  strategy="brrrr"
                  address={form.address || form.dealName || ""}
                  metrics={currentMetrics}
                  history={history}
                  compact={true}
                  actions={[
                    { label: "Save this deal", icon: "💾", primary: true,
                      onClick: () => { saveDeal(); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); } },
                    { label: "Compare to past deals", icon: "📊",
                      onClick: () => navigate("/compare") },
                    { label: "Run sensitivity / stress test", icon: "🎲",
                      onClick: () => navigate("/commercial") },
                  ]}
                />
              </div>
              );
            })()}

            {/* Export PDF */}
            <div className="br-card" style={{marginTop:4}}>
              <div className="br-card-body">
                <button
                  onClick={async () => {
                    if (!calc) return;
                    const fmtM = n => n == null ? "—" : `$${Math.round(n).toLocaleString()}`;
                    const fmtK = n => n == null ? "—" : `$${Math.round(n/1000)}K`;
                    const fmtP = n => n == null || !isFinite(n) ? "—" : `${(n*100).toFixed(1)}%`;
                    const doc = await generateTier1Memo({
                      type: "brrrr",
                      deal: {
                        address: form.address || form.dealName || "BRRRR Deal",
                        purchasePrice: Number(form.purchasePrice),
                        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
                        beds: form.beds ? Number(form.beds) : null,
                        baths: form.baths ? Number(form.baths) : null,
                        sqft: form.sqft ? Number(form.sqft) : null,
                      },
                      summary: {
                        tiles: [
                          { label: "ARV", value: fmtK(calc.arv) },
                          { label: "Cash Left In", value: fmtK(calc.cashLeftInDeal), color: calc.isTrueBRRRR ? "#34d98a" : "#f0a030", sub: calc.isTrueBRRRR ? "True BRRRR ✓" : "Partial cash-out" },
                          { label: "Cash Flow / mo", value: fmtM(calc.monthlyCF), color: calc.monthlyCF >= 0 ? "#34d98a" : "#f25c5c" },
                          { label: "DSCR", value: calc.dscr ? `${calc.dscr.toFixed(2)}x` : "—", color: calc.dscr >= 1.25 ? "#34d98a" : calc.dscr >= 1.0 ? "#f0a030" : "#f25c5c" },
                        ],
                        rows: [
                          { label: "Purchase price",                  value: fmtM(Number(form.purchasePrice)) },
                          { label: "Rehab budget",                    value: fmtM(Number(form.rehabCosts)) },
                          { label: "Closing + holding (acquisition)", value: fmtM(calc.totalCashIn - Number(form.purchasePrice) - Number(form.rehabCosts)) },
                          { label: "Total cash in",                   value: fmtM(calc.totalCashIn), emphasis: true },
                          { break: true },
                          { label: "Stabilised NOI",                  value: fmtM(calc.noi) },
                          { label: "Refi loan amount",                value: fmtM(calc.arv * (Number(form.refinanceLTV)/100)) },
                          { label: "Refi cash returned",              value: fmtM(calc.refiNetProceeds), color: "#34d98a" },
                          { label: "Cash left in deal",               value: fmtM(calc.cashLeftInDeal), emphasis: true, color: calc.isTrueBRRRR ? "#34d98a" : "#f0a030" },
                          { break: true },
                          { label: "Annual cash flow",                value: fmtM(calc.annualCF), color: calc.annualCF >= 0 ? "#34d98a" : "#f25c5c" },
                          { label: "Cash-on-cash return",             value: !isFinite(calc.coc) ? "∞ (true BRRRR)" : fmtP(calc.coc), color: "#34d98a" },
                          { label: "Equity created",                  value: fmtM(calc.equityCreated), color: "#34d98a" },
                        ],
                        verdict: calc.isTrueBRRRR
                          ? `True BRRRR — refi pulls ${fmtM(calc.cashPulledOut)} out of pocket while leaving $0 in.`
                          : calc.monthlyCF >= 200 && calc.dscr >= 1.25
                            ? `Cash-flowing rental with ${fmtM(calc.cashLeftInDeal)} left in. DSCR ${calc.dscr.toFixed(2)}x.`
                            : `Marginal deal — ${fmtM(calc.cashLeftInDeal)} stays in, ${calc.dscr.toFixed(2)}x DSCR. Re-verify rent + reno budget.`,
                        notes: form.notes || "Rates assumed flat through refi. Verify lender terms and post-refi rent before committing capital.",
                        // Adds an LTL Analysis page when the user has run the
                        // rent-roll → loss-to-lease parser on this deal.
                        ltl: ltlData?.ok ? { ...ltlData.ltl, aiRead: ltlData.aiRead } : null,
                      },
                    });
                    doc.save(`investor-memo-brrrr-${new Date().toISOString().slice(0,10)}.pdf`);
                  }}
                  disabled={!calc}
                  style={{width:"100%",background:"rgba(52,217,138,0.1)",border:"1px solid rgba(52,217,138,0.25)",borderRadius: 10,padding:"12px 18px",color:"var(--green)",fontSize:13,fontWeight:700,cursor:calc?"pointer":"not-allowed",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.18s",opacity:calc?1:0.5}}
                  onMouseOver={e=>{if(calc)e.currentTarget.style.background="rgba(52,217,138,0.18)"}}
                  onMouseOut={e=>{e.currentTarget.style.background="rgba(52,217,138,0.1)"}}
                >
                  <span>📄</span> Export Investor Memo
                </button>
              </div>
            </div>

            {/* Save Deal */}
            <div className="br-card" style={{marginTop:4}}>
              <div className="br-card-body">
                {saved ? (
                  <div style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.25)",borderRadius: 10,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>✅</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>Deal saved!</div>
                        <div style={{fontSize:11.5,color:"var(--sub)",marginTop:1}}>{form.dealName || form.address || "BRRRR Deal"}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <ShareDealButton
                        strategy="brrrr"
                        compact
                        deal={{
                          id: Date.now(),
                          type: "brrrr",
                          name: form.dealName || form.address,
                          address: form.address,
                          savedAt: new Date().toISOString(),
                          inputs: form,
                          results: calc,
                          verdict: verdict?.title,
                        }}
                      />
                      <a href="/compare" style={{background:"var(--green)",color:"#ffffff",borderRadius: 6,padding:"8px 16px",fontSize:12,fontWeight:800,textDecoration:"none"}}>View Saved →</a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={saveDeal}
                    style={{width:"100%",background:"linear-gradient(135deg,rgba(167,130,255,0.15),rgba(59,158,255,0.12))",border:"1px solid rgba(167,130,255,0.3)",borderRadius: 10,padding:"14px 18px",color:"var(--text)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.18s"}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(167,130,255,0.6)";e.currentTarget.style.background="linear-gradient(135deg,rgba(167,130,255,0.22),rgba(59,158,255,0.18))"}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(167,130,255,0.3)";e.currentTarget.style.background="linear-gradient(135deg,rgba(167,130,255,0.15),rgba(59,158,255,0.12))"}}
                  >
                    <span style={{fontSize:18}}>💾</span>
                    Save This Deal
                    <span style={{fontSize:11,color:"var(--sub)",fontWeight:500,marginLeft:4}}>· Compare with others →</span>
                  </button>
                )}
              </div>
            </div>

            <CrossLinkCTA
              strategy="brrrr"
              deal={{
                addr:     form.address,
                purchase: parseFloat(form.purchasePrice) || null,
                repair:   parseFloat(form.rehab) || null,
              }}
            />

          </>)}
        </div>
      </div>

      <DealCoach
        property={{ address: form.address, propertyType: "BRRRR rental" }}
        calcs={{
          strategy: "BRRRR",
          purchasePrice: parseFloat(form.purchasePrice) || null,
          arv: parseFloat(form.arv) || null,
          repairCosts: parseFloat(form.rehab) || null,
          monthlyCF: calc?.monthlyCF,
          dscr: calc?.dscr,
          coc: calc?.coc === Infinity ? null : calc?.coc,
          irr: calc?.irr,
          netProfit: calc?.equityCreated,
          cashLeftInDeal: calc?.cashLeftInDeal,
          isTrueBRRRR: calc?.isTrueBRRRR,
          grade: verdict?.title,
        }}
      />
    </div>
  );
}
