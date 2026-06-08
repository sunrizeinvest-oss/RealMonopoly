import { useState, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { generateFlipPDF } from "./generatePDF";
import DealCoach from "./components/DealCoach";
import PropertyIntelCard from "./components/PropertyIntelCard";

const num = v => parseFloat(v) || 0;
const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;

function estimateARV(purchasePrice, repairCost, sqft, beds, baths) {
  const pp = num(purchasePrice), rc = num(repairCost), sf = num(sqft), b = num(beds);
  if (!pp || !sf) return { low: 0, mid: 0, high: 0, ppsf: 0 };
  const basePPSF = pp / sf;
  const repairUplift = rc > 0 ? Math.min((rc / pp) * 1.6 + 1, 1.5) : 1;
  const bdPremium = 1 + (b >= 3 ? 0.04 : b >= 2 ? 0.02 : 0);
  const midPPSF = basePPSF * repairUplift * bdPremium;
  const mid = midPPSF * sf;
  return { low: Math.round(mid * 0.92), mid: Math.round(mid), high: Math.round(mid * 1.08), ppsf: Math.round(midPPSF) };
}

function estimateRent(beds, baths, sqft, arv) {
  const b = num(beds), sf = num(sqft), arvMid = num(arv);
  const grmRent = arvMid > 0 ? arvMid / (12 * 12) : 0;
  const bedBase = b <= 1 ? 1400 : b === 2 ? 1850 : b === 3 ? 2200 : b === 4 ? 2700 : 3200;
  const sfAdj = sf > 0 ? 1 + (sf - 1000) / 10000 : 1;
  const bedRent = bedBase * Math.max(0.85, Math.min(sfAdj, 1.25));
  const blended = grmRent > 0 ? (grmRent * 0.4 + bedRent * 0.6) : bedRent;
  return { low: Math.round(blended * 0.9), mid: Math.round(blended), high: Math.round(blended * 1.1), annual: Math.round(blended * 12), grossYield: arvMid > 0 ? (blended * 12) / arvMid : 0 };
}

function scoreDeal(purchasePrice, repairCost, arvMid, rentMid) {
  const pp = num(purchasePrice), rc = num(repairCost), arv = num(arvMid), rent = num(rentMid);
  if (!pp || !arv) return { score: 0, grade: "—", verdict: "Incomplete", color: "#4a5a72", reasons: [], profit: 0, margin: 0, allIn: 0 };
  let score = 0;
  const reasons = [], flags = [];
  const allIn = pp + rc, profit = arv - allIn, margin = arv > 0 ? profit / arv : 0;
  const ratio = arv > 0 ? pp / arv : 1;
  const repairRatio = pp > 0 ? rc / pp : 0;
  if (margin >= 0.20) { score += 30; reasons.push({ type:"pass", text:`Profit margin ${fmtPct(margin)} — strong (above 20% threshold)` }); }
  else if (margin >= 0.12) { score += 18; reasons.push({ type:"warn", text:`Profit margin ${fmtPct(margin)} — acceptable but thin` }); }
  else if (margin >= 0.05) { score += 8; reasons.push({ type:"warn", text:`Profit margin ${fmtPct(margin)} — very thin` }); }
  else { flags.push({ type:"fail", text:`Profit margin ${fmtPct(margin)} — deal is at or below breakeven` }); }
  if (ratio <= 0.65) { score += 25; reasons.push({ type:"pass", text:`Purchase price is ${fmtPct(1-ratio)} below ARV — excellent entry` }); }
  else if (ratio <= 0.72) { score += 17; reasons.push({ type:"pass", text:`Purchase at ${fmtPct(ratio)} of ARV — within 70% rule` }); }
  else if (ratio <= 0.80) { score += 8; reasons.push({ type:"warn", text:`Purchase at ${fmtPct(ratio)} of ARV — above 70% rule` }); }
  else { flags.push({ type:"fail", text:`Purchase at ${fmtPct(ratio)} of ARV — significantly overpaying` }); }
  if (repairRatio <= 0.20) { score += 20; reasons.push({ type:"pass", text:`Repair cost ${fmtPct(repairRatio)} of purchase — light renovation` }); }
  else if (repairRatio <= 0.40) { score += 13; reasons.push({ type:"warn", text:`Repair cost ${fmtPct(repairRatio)} of purchase — moderate scope` }); }
  else if (repairRatio <= 0.65) { score += 6; reasons.push({ type:"warn", text:`Heavy renovation — ${fmt(rc)} on a ${fmt(pp)} purchase` }); }
  else { flags.push({ type:"fail", text:`Repair cost exceeds 65% of purchase — very high risk` }); }
  if (rent > 0 && arv > 0) {
    const y = (rent * 12) / arv;
    if (y >= 0.08) { score += 15; reasons.push({ type:"pass", text:`Gross yield ${fmtPct(y)} — strong cash flow` }); }
    else if (y >= 0.05) { score += 9; reasons.push({ type:"warn", text:`Gross yield ${fmtPct(y)} — acceptable` }); }
    else { score += 3; reasons.push({ type:"warn", text:`Gross yield ${fmtPct(y)} — low cash flow` }); }
  }
  if (profit >= 40000) { score += 10; reasons.push({ type:"pass", text:`Net profit ${fmt(profit)} — worth the effort` }); }
  else if (profit >= 20000) { score += 6; reasons.push({ type:"warn", text:`Net profit ${fmt(profit)} — acceptable minimum` }); }
  else if (profit > 0) { score += 2; flags.push({ type:"warn", text:`Net profit ${fmt(profit)} — very low for a flip` }); }
  else { flags.push({ type:"fail", text:`Deal is unprofitable at these numbers` }); }
  const allReasons = [...reasons, ...flags];
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 48 ? "C" : score >= 30 ? "D" : "F";
  const verdict = score >= 80 ? "Strong GO" : score >= 65 ? "GO — Proceed" : score >= 48 ? "Caution" : score >= 30 ? "Weak Deal" : "NO-GO";
  const color = score >= 80 ? "var(--green)" : score >= 65 ? "var(--blue)" : score >= 48 ? "var(--amber)" : score >= 30 ? "#f87060" : "var(--red)";
  const bg = score >= 80 ? "rgba(52,217,138,0.07)" : score >= 65 ? "rgba(59,158,255,0.07)" : score >= 48 ? "rgba(240,160,48,0.07)" : "rgba(242,92,92,0.07)";
  const border = score >= 80 ? "rgba(52,217,138,0.2)" : score >= 65 ? "rgba(59,158,255,0.2)" : score >= 48 ? "rgba(240,160,48,0.2)" : "rgba(242,92,92,0.2)";
  return { score, grade, verdict, color, bg, border, profit, margin, allIn, reasons: allReasons };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{overflow-x:hidden}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input,select,textarea{font-size:16px!important;font-family:'DM Sans',sans-serif}
  .da-wrap{min-height:100vh;background:var(--bg)}
  .da-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .da-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}
  .da-logo span{color:var(--blue)}
  .da-nav-right{display:flex;align-items:center;gap:10px}
  .da-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 12px;border-radius:7px}
  .da-nav-link:hover{color:var(--text)}
  .da-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
  .da-nav-btn:hover{background:#5aaeff}
  .da-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
  .da-nav-ghost:hover{border-color:var(--border);color:var(--text)}
  .da-hero{text-align:center;padding:48px 24px 40px;position:relative;overflow:hidden}
  .da-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.03) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .da-hero-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.08) 0%,transparent 65%);pointer-events:none}
  .da-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--blue);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:20px;position:relative;z-index:1}
  .da-hero-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);animation:blink 2s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  .da-hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;letter-spacing:-1.5px;color:var(--text);line-height:1.1;margin-bottom:12px;position:relative;z-index:1}
  .da-hero h1 span{color:var(--blue)}
  .da-hero p{font-size:16px;color:var(--sub);max-width:420px;margin:0 auto;line-height:1.65;position:relative;z-index:1}
  .da-body{max-width:1000px;margin:0 auto;padding:32px 20px 80px;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
  @media(max-width:720px){.da-body{grid-template-columns:1fr}}
  @media(max-width:520px){
    .da-nav{padding:0 14px}
    .da-nav-link{display:none}
    .da-nav-btn{padding:6px 12px;font-size:12px}
    .da-nav-ghost{padding:6px 10px;font-size:12px}
    .da-hero{padding:32px 16px 28px}
    .da-body{padding:20px 14px 60px}
  }
  .da-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
  .da-card-header{padding:18px 22px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;gap:10px}
  .da-card-header-icon{width:28px;height:28px;border-radius:8px;background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .da-card-header-title{font-size:14px;font-weight:700;color:var(--text)}
  .da-card-header-sub{font-size:11px;color:var(--sub);margin-top:1px}
  .da-card-body{padding:22px;display:flex;flex-direction:column;gap:16px}
  .da-field{display:flex;flex-direction:column;gap:5px}
  .da-label{font-size:11.5px;font-weight:600;color:var(--sub);letter-spacing:0.3px}
  .da-input-wrap{position:relative}
  .da-input-pre{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:13px;font-weight:600;pointer-events:none;font-family:'Fira Code',monospace}
  .da-input-suf{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--dim);font-size:12px;pointer-events:none}
  .da-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:10px;padding:11px 12px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.15s,box-shadow 0.15s;-webkit-appearance:none}
  .da-input:focus{border-color:rgba(59,158,255,0.4);box-shadow:0 0 0 3px rgba(59,158,255,0.08)}
  .da-input.has-pre{padding-left:26px}
  .da-input.has-suf{padding-right:44px}
  .da-input-hint{font-size:11px;color:rgba(59,158,255,0.7);font-weight:500}
  .da-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .da-type-toggle{display:flex;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:10px;padding:3px;gap:3px}
  .da-type-btn{flex:1;padding:9px 0;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s}
  .da-type-btn.active{background:var(--blue);color:#fff;box-shadow:0 2px 8px rgba(59,158,255,0.3)}
  .da-type-btn.inactive{background:transparent;color:var(--sub)}
  .da-analyze-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:14px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.18s;margin-top:4px}
  .da-analyze-btn:hover{background:#5aaeff;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,158,255,0.35)}
  .da-analyze-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none;box-shadow:none}
  .da-results{display:flex;flex-direction:column;gap:16px}
  .da-score-card{border-radius:16px;padding:24px;border:1px solid;text-align:center}
  .da-score-ring{width:90px;height:90px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;margin:0 auto 16px;border:3px solid}
  .da-score-num{font-size:30px;font-weight:800;letter-spacing:-1px;font-family:'Fira Code',monospace;line-height:1}
  .da-score-of{font-size:11px;color:var(--sub);margin-top:1px}
  .da-verdict{font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:6px}
  .da-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .da-metric{background:var(--card2);border:1px solid var(--borderf);border-radius:12px;padding:14px 16px}
  .da-metric-label{font-size:10px;font-weight:700;color:var(--dim);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:5px}
  .da-metric-val{font-size:18px;font-weight:800;font-family:'Fira Code',monospace;letter-spacing:-0.5px;line-height:1}
  .da-metric-sub{font-size:10.5px;color:var(--sub);margin-top:4px}
  .da-reasons{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
  .da-reasons-header{padding:13px 18px;border-bottom:1px solid var(--borderf);background:var(--card2);font-size:12px;font-weight:700;color:var(--sub);letter-spacing:0.5px;text-transform:uppercase}
  .da-reason{display:flex;gap:10px;align-items:flex-start;padding:11px 18px;border-bottom:1px solid var(--borderf);font-size:13px;line-height:1.55}
  .da-reason:last-child{border-bottom:none}
  .da-reason.pass{color:#7adfaa}
  .da-reason.warn{color:#f0c070}
  .da-reason.fail{color:#f08080}
  .da-save-prompt{background:var(--card);border:1px solid var(--borderf);border-radius:14px;padding:20px;text-align:center}
  .da-save-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px}
  .da-save-sub{font-size:13px;color:var(--sub);margin-bottom:16px;line-height:1.55}
  .da-save-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
  .da-save-btn{background:var(--blue);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
  .da-save-btn:hover{background:#5aaeff}
  .da-save-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:8px;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer}
  .da-pdf-btn{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:8px;padding:10px 16px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
  .da-pdf-btn:hover{border-color:var(--border);color:var(--text)}
  .da-placeholder{background:var(--card);border:1px dashed var(--borderf);border-radius:16px;padding:48px 24px;text-align:center}
  .da-placeholder-icon{font-size:36px;margin-bottom:14px}
  .da-placeholder-title{font-size:15px;font-weight:600;color:var(--sub);margin-bottom:6px}
  .da-placeholder-sub{font-size:13px;color:var(--dim);line-height:1.6}
  .da-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
  .da-modal{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:32px 28px;width:100%;max-width:380px;position:relative}
  .da-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--dim);font-size:20px;cursor:pointer;line-height:1;padding:4px}
  .da-modal-close:hover{color:var(--text)}
  .da-modal-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:6px}
  .da-modal-sub{font-size:13px;color:var(--sub);margin-bottom:24px;line-height:1.55}
  .da-modal-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
  .da-modal-label{font-size:11.5px;font-weight:600;color:var(--sub)}
  .da-modal-input{background:rgba(255,255,255,0.05);border:1px solid var(--borderf);border-radius:9px;padding:12px 14px;font-size:14px;color:var(--text);outline:none;width:100%;font-family:'DM Sans',sans-serif}
  .da-modal-input:focus{border-color:rgba(59,158,255,0.4)}
  .da-modal-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:9px;padding:13px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
  .da-modal-btn:hover{background:#5aaeff}
  .da-modal-btn:disabled{background:var(--dim);cursor:not-allowed}
  .da-modal-toggle{text-align:center;margin-top:16px;font-size:13px;color:var(--sub)}
  .da-modal-toggle span{color:var(--blue);cursor:pointer;font-weight:600}
  .da-modal-divider{display:flex;align-items:center;gap:12px;margin:18px 0}
  .da-modal-divider::before,.da-modal-divider::after{content:'';flex:1;height:1px;background:var(--borderf)}
  .da-modal-divider span{font-size:11px;color:var(--dim)}
  .da-modal-google{width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--borderf);border-radius:9px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
  .da-modal-google:hover{background:rgba(255,255,255,0.08)}
  .da-saved-banner{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--green);font-weight:500}
  .da-upgrade-success{background:linear-gradient(135deg,rgba(52,217,138,0.1),rgba(59,158,255,0.1));border:1px solid rgba(52,217,138,0.3);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;margin:0 auto 0;max-width:1000px;width:calc(100% - 40px)}
  .da-upgrade-success-icon{font-size:24px;flex-shrink:0}
  .da-upgrade-success-text{flex:1}
  .da-upgrade-success-title{font-size:14px;font-weight:700;color:var(--green);margin-bottom:2px}
  .da-upgrade-success-sub{font-size:12px;color:var(--sub)}
  .da-upgrade-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
  .da-upgrade-modal{background:var(--card);border:1px solid rgba(59,158,255,0.25);border-radius:20px;padding:36px 28px;width:100%;max-width:400px;position:relative;text-align:center;box-shadow:0 32px 100px rgba(0,0,0,0.6)}
  .da-upgrade-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--dim);font-size:20px;cursor:pointer;padding:4px;line-height:1}
  .da-upgrade-close:hover{color:var(--text)}
  .da-upgrade-icon{font-size:42px;margin-bottom:14px}
  .da-upgrade-title{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:8px}
  .da-upgrade-sub{font-size:14px;color:var(--sub);margin-bottom:24px;line-height:1.6}
  .da-upgrade-perks{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.12);border-radius:12px;padding:16px;margin-bottom:24px;text-align:left;display:flex;flex-direction:column;gap:8px}
  .da-upgrade-perk{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text)}
  .da-upgrade-perk-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0}
  .da-upgrade-price{font-size:13px;color:var(--sub);margin-bottom:16px}
  .da-upgrade-price strong{color:var(--text);font-size:18px}
  .da-upgrade-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:15px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.18s}
  .da-upgrade-btn:hover{background:#5aaeff;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,158,255,0.35)}
  .da-upgrade-cancel{margin-top:12px;font-size:13px;color:var(--dim);cursor:pointer}
  .da-upgrade-cancel:hover{color:var(--sub)}
`;

export default function DealAnalyzer() {
  const { user, signIn, signUp, signInWithGoogle, signOut, saveDeal, getSubscription } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('save');
  const [justUpgraded, setJustUpgraded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setJustUpgraded(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [dealType, setDealType] = useState("flip");
  const [form, setForm] = useState(() => {
    // Prefill from URL params — used by the Chrome extension + shareable deal links
    const sp = new URLSearchParams(window.location.search);
    return {
      address:       sp.get("addr")     || "",
      purchasePrice: sp.get("purchase") || "",
      repairCost:    sp.get("repair")   || "",
      sqft:          sp.get("sqft")     || "",
      beds:          sp.get("beds")     || "",
      baths:         sp.get("baths")    || "",
    };
  });
  const [analyzed, setAnalyzed] = useState(() => {
    // If we got prefill data, jump straight to the results view
    const sp = new URLSearchParams(window.location.search);
    return !!(sp.get("purchase") && sp.get("sqft"));
  });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("signup");
  const [justSaved, setJustSaved] = useState(false);
  const [authForm, setAuthForm] = useState({ email:"", password:"" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const canAnalyze = num(form.purchasePrice) > 0 && num(form.sqft) > 0;

  const arv = useMemo(() => estimateARV(form.purchasePrice, form.repairCost, form.sqft, form.beds, form.baths), [form]);
  const rent = useMemo(() => estimateRent(form.beds, form.baths, form.sqft, arv.mid), [form, arv.mid]);
  const deal = useMemo(() => scoreDeal(form.purchasePrice, form.repairCost, arv.mid, rent.mid), [form, arv.mid, rent.mid]);

  async function handleSave() {
    if (!user) { setShowModal(true); return; }
    const { error } = await saveDeal({
      deal_type: dealType, address: form.address,
      purchase_price: num(form.purchasePrice), repair_cost: num(form.repairCost),
      sqft: num(form.sqft), beds: num(form.beds), baths: num(form.baths),
      arv_low: arv.low, arv_mid: arv.mid, arv_high: arv.high,
      rent_low: rent.low, rent_mid: rent.mid, rent_high: rent.high,
      score: deal.score, verdict: deal.verdict, profit: deal.profit, margin: deal.margin,
    });
    if (error === 'SAVE_LIMIT_REACHED') { setUpgradeReason('save'); setShowUpgrade(true); return; }
    if (!error) { setJustSaved(true); setTimeout(() => setJustSaved(false), 3000); }
  }

  async function handleExportPDF() {
    if (!user) { setUpgradeReason('pdf'); setShowModal(true); return; }
    setPdfLoading(true);
    const { data: sub } = await getSubscription();
    const isPro = sub?.status === 'active' && sub?.plan === 'pro';
    if (!isPro) { setPdfLoading(false); setUpgradeReason('pdf'); setShowUpgrade(true); return; }
    generateFlipPDF({ form, arv, rent, deal });
    setPdfLoading(false);
  }

  async function handleAuth() {
    setAuthError(""); setAuthLoading(true);
    const { error } = modalMode === "signup"
      ? await signUp(authForm.email, authForm.password)
      : await signIn(authForm.email, authForm.password);
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setShowModal(false);
    if (analyzed) handleSave();
  }

  async function handleGoogle() {
    setAuthError("");
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  }

  return (
    <div className="da-wrap">
      <style>{CSS}</style>
      <nav className="da-nav">
        <a href="/" className="da-logo"><span>Real</span> Deal</a>
        <div className="da-nav-right">
          <a href="/app" className="da-nav-link" style={{color:"var(--blue)"}}>Flip</a>
          <a href="/commercial" className="da-nav-link">Multifamily</a>
          <a href="/brrrr" className="da-nav-link">BRRRR</a>
          <a href="/compare" className="da-nav-link">Compare</a>
          {user ? (
            <>
              <a href="/dashboard" className="da-nav-btn" style={{textDecoration:"none",display:"inline-flex"}}>My Deals</a>
              <button className="da-nav-ghost" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <button className="da-nav-ghost" onClick={() => { setModalMode("login"); setShowModal(true); }}>Log in</button>
              <button className="da-nav-btn" onClick={() => { setModalMode("signup"); setShowModal(true); }}>Sign up free</button>
            </>
          )}
        </div>
      </nav>

      {justUpgraded && (
        <div style={{padding:"16px 20px 0"}}>
          <div className="da-upgrade-success">
            <div className="da-upgrade-success-icon">🎉</div>
            <div className="da-upgrade-success-text">
              <div className="da-upgrade-success-title">You're now a Pro member — welcome!</div>
              <div className="da-upgrade-success-sub">Unlimited deal saves unlocked. Head to <a href="/commercial" style={{color:"var(--blue)",fontWeight:600}}>Commercial Analyzer</a> to try your new tools.</div>
            </div>
            <button onClick={() => setJustUpgraded(false)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:18,padding:4,lineHeight:1}}>×</button>
          </div>
        </div>
      )}

      <div className="da-hero">
        <div className="da-hero-glow"></div>
        <div className="da-hero-tag"><div className="da-hero-tag-dot"></div>Deal Analyzer</div>
        <h1>Is this a <span>real deal?</span></h1>
        <p>Enter a property and get an instant score, ARV estimate, rental potential, and plain-English verdict.</p>
      </div>

      <div className="da-body">
        <div className="da-card">
          <div className="da-card-header">
            <div className="da-card-header-icon">📋</div>
            <div>
              <div className="da-card-header-title">Property Details</div>
              <div className="da-card-header-sub">Fill in what you know — more detail = better estimate</div>
            </div>
          </div>
          <div className="da-card-body">
            {/* Try Sample Deal — activation primer */}
            <div style={{
              background:"linear-gradient(135deg, rgba(52,217,138,0.08), rgba(59,158,255,0.06))",
              border:"1px solid rgba(52,217,138,0.25)",
              borderRadius:"var(--r-md,6px)",
              padding:"10px 12px",marginBottom:14,
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:10
            }}>
              <div>
                <div style={{fontFamily:"'Fira Code',monospace",fontSize:9,fontWeight:700,color:"var(--green)",letterSpacing:"0.7px",marginBottom:2}}>
                  ▸ TRY SAMPLE
                </div>
                <div style={{fontSize:12,color:"var(--text)"}}>Edmonton flip · pre-filled</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    address: "10646 61 Avenue NW, Edmonton, AB",
                    purchasePrice: "385000", repairCost: "65000",
                    sqft: "1450", beds: "3", baths: "2",
                  });
                  setDealType("flip");
                  setTimeout(() => setAnalyzed(true), 100);
                }}
                style={{
                  fontFamily:"'Fira Code',monospace",fontSize:10.5,fontWeight:700,letterSpacing:"0.5px",
                  padding:"6px 12px",border:"1px solid var(--green)",borderRadius:"var(--r-sm,4px)",
                  color:"#07090f",background:"var(--green)",cursor:"pointer",whiteSpace:"nowrap"
                }}>
                ▶ LOAD
              </button>
            </div>
            <div className="da-field">
              <div className="da-label">Deal Type</div>
              <div className="da-type-toggle">
                <button className={`da-type-btn ${dealType==="flip"?"active":"inactive"}`} onClick={() => setDealType("flip")}>🔨 Flip</button>
                <button className={`da-type-btn ${dealType==="rental"?"active":"inactive"}`} onClick={() => setDealType("rental")}>🏠 Rental</button>
              </div>
            </div>
            <div className="da-field">
              <div className="da-label">Property Address</div>
              <div className="da-input-wrap">
                <input className="da-input" type="text" placeholder="123 Main St, Calgary, AB" value={form.address} onChange={set("address")} />
              </div>
            </div>

            {/* Live zoning + assessment + permits + AI thesis (Edmonton + Calgary) */}
            <PropertyIntelCard address={form.address} />

            <div className="da-field-row">
              <div className="da-field">
                <div className="da-label">Purchase Price</div>
                <div className="da-input-wrap">
                  <span className="da-input-pre">$</span>
                  <input className="da-input has-pre" type="number" placeholder="350000" value={form.purchasePrice} onChange={set("purchasePrice")} />
                </div>
              </div>
              <div className="da-field">
                <div className="da-label">Repair / Reno Cost</div>
                <div className="da-input-wrap">
                  <span className="da-input-pre">$</span>
                  <input className="da-input has-pre" type="number" placeholder="45000" value={form.repairCost} onChange={set("repairCost")} />
                </div>
              </div>
            </div>
            <div className="da-field">
              <div className="da-label">Square Footage</div>
              <div className="da-input-wrap">
                <input className="da-input has-suf" type="number" placeholder="1800" value={form.sqft} onChange={set("sqft")} />
                <span className="da-input-suf">sqft</span>
              </div>
              {num(form.sqft) > 0 && num(form.purchasePrice) > 0 && (
                <div className="da-input-hint">{fmt(num(form.purchasePrice)/num(form.sqft))}/sqft purchase basis</div>
              )}
            </div>
            <div className="da-field-row">
              <div className="da-field">
                <div className="da-label">Bedrooms</div>
                <div className="da-input-wrap">
                  <input className="da-input has-suf" type="number" placeholder="3" value={form.beds} onChange={set("beds")} />
                  <span className="da-input-suf">bed</span>
                </div>
              </div>
              <div className="da-field">
                <div className="da-label">Bathrooms</div>
                <div className="da-input-wrap">
                  <input className="da-input has-suf" type="number" placeholder="2" value={form.baths} onChange={set("baths")} />
                  <span className="da-input-suf">bath</span>
                </div>
              </div>
            </div>
            <button className="da-analyze-btn" onClick={() => setAnalyzed(true)} disabled={!canAnalyze}>
              {canAnalyze ? "Analyze This Deal →" : "Enter purchase price + sqft to analyze"}
            </button>
          </div>
        </div>

        <div className="da-results">
          {!analyzed ? (
            <div className="da-placeholder">
              <div className="da-placeholder-icon">🏠</div>
              <div className="da-placeholder-title">Your analysis will appear here</div>
              <div className="da-placeholder-sub">Fill in the property details and click Analyze to get your score, ARV estimate, rental potential, and deal verdict.</div>
            </div>
          ) : (
            <>
              <div className="da-score-card" style={{background:deal.bg,borderColor:deal.border}}>
                <div className="da-score-ring" style={{borderColor:deal.color,background:`${deal.color}12`}}>
                  <div className="da-score-num" style={{color:deal.color}}>{deal.score}</div>
                  <div className="da-score-of">/100</div>
                </div>
                <div className="da-verdict" style={{color:deal.color}}>{deal.verdict}</div>
                {form.address && <div style={{fontSize:12,color:"var(--sub)"}}>{form.address.split(",")[0]}</div>}
              </div>

              <div className="da-metrics">
                <div className="da-metric">
                  <div className="da-metric-label">Estimated ARV</div>
                  <div className="da-metric-val" style={{color:"var(--blue)"}}>{fmt(arv.mid)}</div>
                  <div className="da-metric-sub">Range: {fmt(arv.low)} – {fmt(arv.high)}</div>
                </div>
                <div className="da-metric">
                  <div className="da-metric-label">{dealType==="flip" ? "Est. Net Profit" : "Est. Monthly Rent"}</div>
                  <div className="da-metric-val" style={{color:deal.profit>0?"var(--green)":"var(--red)"}}>
                    {dealType==="flip" ? fmt(deal.profit) : fmt(rent.mid)}
                  </div>
                  {dealType==="flip"
                    ? <div className="da-metric-sub">Margin: {fmtPct(deal.margin)}</div>
                    : <div className="da-metric-sub">Range: {fmt(rent.low)} – {fmt(rent.high)}/mo</div>
                  }
                </div>
                <div className="da-metric">
                  <div className="da-metric-label">All-In Cost</div>
                  <div className="da-metric-val" style={{color:"var(--text)"}}>{fmt(deal.allIn)}</div>
                  <div className="da-metric-sub">Purchase + repairs</div>
                </div>
                <div className="da-metric">
                  <div className="da-metric-label">Gross Rental Yield</div>
                  <div className="da-metric-val" style={{color:rent.grossYield>=0.07?"var(--green)":"var(--amber)"}}>{fmtPct(rent.grossYield)}</div>
                  <div className="da-metric-sub">{fmt(rent.annual)}/yr estimated</div>
                </div>
              </div>

              {/* ── Profit Waterfall (flip only) ─────────────────────────── */}
              {dealType === "flip" && arv.mid > 0 && (() => {
                const pp = num(form.purchasePrice);
                const rc = num(form.repairCost);
                // Standard flip costs not in the current model — surface them here
                // so the chart shows the REAL economics, not the simplified profit.
                const sellingCosts = arv.mid * 0.085;   // 8.5% — agent + closing + title
                const acquisitionCosts = pp * 0.02;     // 2% — closing on buy side
                const holdingCosts = pp * 0.0012 * 4;   // ~0.12%/mo × 4mo typical flip
                const realProfit = arv.mid - pp - rc - sellingCosts - acquisitionCosts - holdingCosts;
                const segments = [
                  {lbl:"PURCHASE",   val: pp,                color:"var(--blue)", pct: arv.mid ? pp/arv.mid : 0},
                  {lbl:"REPAIRS",    val: rc,                color:"var(--amber)", pct: arv.mid ? rc/arv.mid : 0},
                  {lbl:"SELL COSTS", val: sellingCosts,      color:"var(--purple)", pct: 0.085},
                  {lbl:"ACQUIS.",    val: acquisitionCosts,  color:"var(--purple)", pct: arv.mid ? acquisitionCosts/arv.mid : 0},
                  {lbl:"HOLDING",    val: holdingCosts,      color:"#7888a0", pct: arv.mid ? holdingCosts/arv.mid : 0},
                  {lbl: realProfit >= 0 ? "PROFIT" : "LOSS",
                                     val: Math.abs(realProfit),
                                     color: realProfit >= 0 ? "var(--green)" : "var(--red)",
                                     pct: arv.mid ? Math.abs(realProfit)/arv.mid : 0},
                ];
                return (
                  <div style={{
                    background:"var(--card)",border:"1px solid var(--borderf)",
                    borderRadius:"var(--r-md,6px)",padding:"14px 16px",marginBottom:16
                  }}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontFamily:"'Fira Code',monospace",fontSize:10,fontWeight:700,color:"var(--green)",letterSpacing:"0.7px"}}>
                        ▸ PROFIT WATERFALL · ARV {fmt(arv.mid)}
                      </div>
                      <div style={{fontFamily:"'Fira Code',monospace",fontSize:10.5,fontWeight:700,color: realProfit >= 0 ? "var(--green)" : "var(--red)"}}>
                        NET {realProfit >= 0 ? "▲" : "▼"} {fmt(Math.abs(realProfit))}
                      </div>
                    </div>
                    {/* Stacked horizontal bar */}
                    <div style={{display:"flex",height:32,borderRadius:"var(--r-xs,2px)",overflow:"hidden",border:"1px solid var(--borderf)"}}>
                      {segments.map(s => s.val > 0 && (
                        <div key={s.lbl} title={`${s.lbl}: ${fmt(s.val)}`} style={{
                          width:`${(s.pct*100).toFixed(2)}%`,
                          background:s.color,
                          minWidth: s.pct > 0.005 ? "auto" : 0,
                          borderRight: "1px solid rgba(0,0,0,0.25)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontFamily:"'Fira Code',monospace",fontSize:9,fontWeight:700,
                          color:"rgba(0,0,0,0.7)",letterSpacing:"0.4px",overflow:"hidden",whiteSpace:"nowrap"
                        }}>
                          {s.pct > 0.06 ? s.lbl : ""}
                        </div>
                      ))}
                    </div>
                    {/* Segment legend */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
                      {segments.filter(s => s.val > 0).map(s => (
                        <div key={s.lbl} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontFamily:"'Fira Code',monospace"}}>
                          <span style={{width:10,height:10,background:s.color,borderRadius:2,flexShrink:0}}/>
                          <span style={{color:"var(--sub)",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.lbl}</span>
                          <span style={{color:"var(--text)",fontWeight:700}}>{fmt(s.val)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:8,fontSize:10,color:"var(--dim)",fontFamily:"'Fira Code',monospace",lineHeight:1.5}}>
                      Includes 8.5% selling, 2% acquisition, ~0.5% holding (4mo). Scorecard "Net Profit" excludes these — waterfall is the truer number.
                    </div>
                  </div>
                );
              })()}

              <div className="da-reasons">
                <div className="da-reasons-header">Why this score</div>
                {deal.reasons.map((r,i) => (
                  <div key={i} className={`da-reason ${r.type}`}>
                    <span>{r.type==="pass"?"✅":r.type==="warn"?"⚠️":"🚫"}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>

              {justSaved ? (
                <div className="da-saved-banner">
                  <span>✅</span>
                  <span>Deal saved — <a href="/dashboard" style={{color:"var(--green)",fontWeight:700}}>View my deals →</a></span>
                </div>
              ) : (
                <div className="da-save-prompt">
                  <div className="da-save-title">Want to save this deal?</div>
                  <div className="da-save-sub">{user ? "Save this deal to your account." : "Create a free account to save deals and track your pipeline."}</div>
                  <div className="da-save-btns">
                    <button className="da-save-btn" onClick={handleSave}>{user ? "💾 Save Deal" : "Save this deal →"}</button>
                    <button className="da-pdf-btn" onClick={handleExportPDF} disabled={pdfLoading}>
                      {pdfLoading ? "Generating…" : "📄 Export PDF"}
                      <span style={{fontSize:9,fontWeight:700,background:"rgba(255,190,50,0.15)",color:"#ffbe32",border:"1px solid rgba(255,190,50,0.25)",borderRadius:4,padding:"1px 5px",letterSpacing:"0.4px"}}>PRO</span>
                    </button>
                    <button className="da-save-ghost" onClick={() => { setAnalyzed(false); setForm({address:"",purchasePrice:"",repairCost:"",sqft:"",beds:"",baths:""}); }}>Analyze another</button>
                  </div>
                </div>
              )}

              <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:12,padding:"16px 18px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:5}}>Need a full breakdown?</div>
                <div style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>Get exact loan costs, holding costs, realtor fees, MAO, and tiered commission.</div>
                <a href="/app" style={{display:"inline-block",background:"rgba(59,158,255,0.1)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:8,padding:"9px 20px",color:"var(--blue)",fontSize:13,fontWeight:700,textDecoration:"none"}}>Open Full Analyzer →</a>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="da-modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="da-modal">
            <button className="da-modal-close" onClick={() => setShowModal(false)}>×</button>
            <div className="da-modal-title">{modalMode==="signup" ? "Create your account" : "Welcome back"}</div>
            <div className="da-modal-sub">{modalMode==="signup" ? "Free forever. Save deals and track your pipeline." : "Sign in to access your saved deals."}</div>
            <button className="da-modal-google" onClick={handleGoogle}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div className="da-modal-divider"><span>or</span></div>
            <div className="da-modal-field">
              <div className="da-modal-label">Email</div>
              <input className="da-modal-input" type="email" placeholder="you@email.com" value={authForm.email} onChange={e => setAuthForm(p=>({...p,email:e.target.value}))} />
            </div>
            <div className="da-modal-field">
              <div className="da-modal-label">Password</div>
              <input className="da-modal-input" type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm(p=>({...p,password:e.target.value}))} />
            </div>
            {authError && <div style={{background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"var(--red)",marginBottom:8}}>{authError}</div>}
            <button className="da-modal-btn" onClick={handleAuth} disabled={authLoading}>
              {authLoading ? "Please wait..." : modalMode==="signup" ? "Create account & save deal" : "Sign in & save deal"}
            </button>
            <div className="da-modal-toggle">
              {modalMode==="signup"
                ? <>Already have an account? <span onClick={() => setModalMode("login")}>Sign in</span></>
                : <>Don't have an account? <span onClick={() => setModalMode("signup")}>Sign up free</span></>
              }
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div className="da-upgrade-overlay" onClick={e => e.target===e.currentTarget && setShowUpgrade(false)}>
          <div className="da-upgrade-modal">
            <button className="da-upgrade-close" onClick={() => setShowUpgrade(false)}>×</button>
            <div className="da-upgrade-icon">{upgradeReason === 'pdf' ? '📄' : '🔒'}</div>
            <div className="da-upgrade-title">{upgradeReason === 'pdf' ? 'PDF Export is Pro' : "You've used your 3 free saves"}</div>
            <div className="da-upgrade-sub">{upgradeReason === 'pdf' ? 'Upgrade to Pro to download a branded one-page deal report — perfect for lenders and JV partners.' : 'Upgrade to Pro to save unlimited deals and unlock the full commercial analysis toolkit.'}</div>
            <div className="da-upgrade-perks">
              <div className="da-upgrade-perk"><div className="da-upgrade-perk-dot"></div>Unlimited deal saves</div>
              <div className="da-upgrade-perk"><div className="da-upgrade-perk-dot"></div>Commercial deal analysis (multi-family, mixed-use)</div>
              <div className="da-upgrade-perk"><div className="da-upgrade-perk-dot"></div>Cap rate, NOI & cash-on-cash calculator</div>
              <div className="da-upgrade-perk"><div className="da-upgrade-perk-dot"></div>Export deals to PDF & CSV</div>
              <div className="da-upgrade-perk"><div className="da-upgrade-perk-dot"></div>Priority support</div>
            </div>
            <div className="da-upgrade-price"><strong>$29</strong> / month — cancel anytime</div>
            <button className="da-upgrade-btn" onClick={async () => {
              try {
                const res = await fetch('/api/create-checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user?.id, email: user?.email }),
                });
                const { url } = await res.json();
                if (url) window.location.href = url;
              } catch (e) {
                console.error(e);
              }
            }}>Upgrade to Pro →</button>
            <div className="da-upgrade-cancel" onClick={() => setShowUpgrade(false)}>Maybe later</div>
          </div>
        </div>
      )}

      <DealCoach
        property={{ address: form.address, propertyType: "Fix & Flip" }}
        calcs={{
          strategy: "Flip",
          purchasePrice: parseFloat(form.purchasePrice) || null,
          repairCosts: parseFloat(form.repairCost) || null,
          arv: arv.mid,
          rentEstimate: rent.mid,
          netProfit: deal.profit,
          margin: deal.margin,
          grade: deal.grade,
          verdict: deal.verdict,
        }}
      />
    </div>
  );
}
