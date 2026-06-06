import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const DEALS = [
  {addr:"142 Birchwood Dr",city:"Calgary, AB",profit:38400,roi:12.8,coc:22.4,arv:310000,verdict:"go"},
  {addr:"58 Maple Ct",city:"Edmonton, AB",profit:61200,roi:18.3,coc:31.6,arv:485000,verdict:"go"},
  {addr:"903 Elm St",city:"Vancouver, BC",profit:-8400,roi:-2.8,coc:-5.1,arv:220000,verdict:"no"},
  {addr:"17 Sunrise Blvd",city:"Toronto, ON",profit:44800,roi:14.2,coc:24.8,arv:520000,verdict:"go"},
  {addr:"334 Oak Ave",city:"Ottawa, ON",profit:22100,roi:8.1,coc:14.3,arv:380000,verdict:"warn"},
  {addr:"2201 Palm Ln",city:"Halifax, NS",profit:87300,roi:21.4,coc:38.2,arv:680000,verdict:"go"},
  {addr:"76 Cedar Ridge",city:"Winnipeg, MB",profit:31600,roi:11.2,coc:19.7,arv:295000,verdict:"go"},
  {addr:"441 River Rd",city:"Phoenix, AZ",profit:52400,roi:16.1,coc:28.4,arv:395000,verdict:"go"},
  {addr:"1804 Lakeview Dr",city:"Austin, TX",profit:-3200,roi:-1.4,coc:-2.8,arv:185000,verdict:"no"},
  {addr:"992 Westgate",city:"Denver, CO",profit:73100,roi:19.8,coc:35.5,arv:560000,verdict:"go"},
];

const TESTIMONIALS = [
  { name: "Marcus T.", role: "Fix & Flip Investor", location: "Calgary, AB", deals: 14, quote: "I used to spend 2 hours in Excel for every deal. Now I know in 5 minutes. Passed on 3 duds and locked in 2 great flips this quarter alone.", avatar: "M", color: "#3b9eff" },
  { name: "Priya S.", role: "BRRRR Investor", location: "Toronto, ON", deals: 7, quote: "The BRRRR calculator showed me I wasn't actually recycling my cash — I was leaving $40k locked in the deal. That one insight changed my whole strategy.", avatar: "P", color: "#34d98a" },
  { name: "Derek L.", role: "Multifamily Investor", location: "Phoenix, AZ", deals: 3, quote: "The multifamily underwriter is institutional-grade. Cap rate, DSCR, 5-year projections — everything I need to present to lenders. And it's free right now.", avatar: "D", color: "#a782ff" },
  { name: "Jen K.", role: "Real Estate Agent", location: "Denver, CO", deals: 22, quote: "I use the Deal Comparison tool to show clients exactly why one property beats another on every metric. Closed 4 investment deals last month with it.", avatar: "J", color: "#f0a030" },
];

const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => `${n.toFixed(1)}%`;
const num = v => parseFloat(v) || 0;

function calcFlip(arv, purchase, repair, hold) {
  const totalCost = purchase + repair + (purchase * 0.02) + (arv * 0.055) + (arv * 0.0012 * hold) + (500 * hold);
  const profit = arv - totalCost;
  const margin = arv > 0 ? profit / arv : 0;
  return { profit, margin, totalCost };
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, signUp, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState("signup");

  // Live demo state
  const [dArv, setDArv] = useState("385000");
  const [dPurchase, setDPurchase] = useState("250000");
  const [dRepair, setDRepair] = useState("55000");
  const [dHold, setDHold] = useState("6");

  const demo = useMemo(() => {
    return calcFlip(num(dArv), num(dPurchase), num(dRepair), num(dHold));
  }, [dArv, dPurchase, dRepair, dHold]);

  const dGrade = demo.margin > 0.20 ? { g: "A", c: "#34d98a", label: "✅ Strong GO" }
    : demo.margin > 0.12 ? { g: "B", c: "#3b9eff", label: "✅ GO" }
    : demo.margin > 0.05 ? { g: "C", c: "#f0a030", label: "⚠️ Caution" }
    : { g: "F", c: "#f25c5c", label: "🚫 No-Go" };

  useEffect(() => { if (user) navigate("/analyze"); }, [user]);

  useEffect(() => {
    // Animate counters
    setTimeout(() => {
      [['cDeals', 4180, 2400, '', '', false], ['cProfit', 47300, 2800, '$', '', false], ['cROI', 14.8, 2200, '', '%', true]].forEach(([id, to, dur, pre, suf, dec]) => {
        const el = document.getElementById(id);
        if (!el) return;
        let start = null;
        function step(ts) {
          if (!start) start = ts;
          const p = Math.min((ts - start) / dur, 1);
          const e = 1 - Math.pow(1 - p, 3);
          const v = to * e;
          el.textContent = pre + (dec ? v.toFixed(1) : Math.round(v).toLocaleString()) + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, 500);

    // Deal ticker
    const track = document.getElementById('dealsTrack');
    if (track) {
      [...DEALS, ...DEALS].forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'deal-chip';
        chip.innerHTML = `<div class="dc-icon">🏠</div><div><div class="dc-addr">${d.addr}</div><div class="dc-city">${d.city} · CoC ${d.coc.toFixed(1)}%</div></div><div class="dc-profit ${d.profit > 0 ? 'pos' : 'neg'}">${fmt(d.profit)}</div><div class="dc-badge ${d.verdict}">${d.verdict === 'go' ? '✅ GO' : d.verdict === 'no' ? '🚫 NO-GO' : '⚠️ CAUTION'}</div>`;
        track.appendChild(chip);
      });
    }

    // Scroll reveal
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.06 });
    document.querySelectorAll('.fade').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  async function handleSubmit(e) {
    e?.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const { error } = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setSubmitted(true);
    setTimeout(() => navigate("/analyze"), 1200);
  }

  async function handleGoogle() {
    setAuthError("");
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  }

  function scrollToAuth() {
    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#07090f;--card:#0d1119;--card2:#0a0e18;--border:rgba(59,158,255,0.13);--borderf:rgba(255,255,255,0.07);--text:#dde4ef;--sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff;--green:#2dd47f;--red:#f25c5c;--amber:#f0a030}
    html{scroll-behavior:smooth}
    body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}

    /* ── NAV ── */
    .ld-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;background:rgba(7,9,15,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf)}
    .ld-logo{font-size:16px;font-weight:800;color:var(--text);letter-spacing:-0.3px;text-decoration:none}
    .ld-logo span{color:var(--blue)}
    .ld-nav-right{display:flex;align-items:center;gap:10px}
    .ld-nav-link{font-size:13px;color:var(--sub);cursor:pointer;font-weight:500;padding:6px 12px;border-radius:7px;background:none;border:none;font-family:'DM Sans',sans-serif;transition:color 0.15s}
    .ld-nav-link:hover{color:var(--text)}
    .ld-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:8px 18px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s}
    .ld-nav-btn:hover{background:#5aabff;transform:translateY(-1px)}

    /* ── HERO ── */
    .ld-hero{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:100px 24px 60px;position:relative;overflow:hidden}
    .ld-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.03) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
    .ld-glow{position:absolute;top:20%;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(59,158,255,0.09) 0%,transparent 65%);pointer-events:none;animation:breathe 5s ease-in-out infinite}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:0.55}}
    .ld-hero-inner{max-width:1140px;width:100%;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;z-index:1}
    .ld-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:20px;display:flex;align-items:center;gap:8px}
    .ld-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);animation:blink 2s infinite;flex-shrink:0}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    .ld-h1{font-size:clamp(36px,5vw,60px);font-weight:800;line-height:1.06;letter-spacing:-2.5px;color:var(--text);margin-bottom:20px}
    .ld-h1 span{color:var(--blue)}
    .ld-hero-p{font-size:17px;color:var(--sub);line-height:1.75;margin-bottom:32px;max-width:460px}
    .ld-hero-trust{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:32px}
    .ld-trust-pill{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sub);font-weight:500}
    .ld-trust-check{color:var(--green);font-size:14px}
    .ld-stats{display:flex;gap:32px;flex-wrap:wrap}
    .ld-stat-val{font-size:26px;font-weight:800;color:var(--blue);letter-spacing:-0.5px;line-height:1}
    .ld-stat-lbl{font-size:10px;font-weight:600;color:var(--dim);letter-spacing:0.8px;text-transform:uppercase;margin-top:4px}

    /* ── AUTH CARD ── */
    .ld-auth-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:32px 28px;box-shadow:0 24px 80px rgba(0,0,0,0.55)}
    .ld-auth-title{font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.3px}
    .ld-auth-sub{font-size:13px;color:var(--sub);margin-bottom:22px}
    .ld-tabs{display:flex;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:3px;gap:3px;margin-bottom:20px}
    .ld-tab{flex:1;padding:8px 0;border:none;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s}
    .ld-tab.active{background:var(--blue);color:#fff}
    .ld-tab.inactive{background:transparent;color:var(--sub)}
    .ld-google{width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--borderf);border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s;margin-bottom:4px}
    .ld-google:hover{background:rgba(255,255,255,0.09);border-color:var(--border)}
    .ld-divider{display:flex;align-items:center;gap:10px;margin:14px 0}
    .ld-divider::before,.ld-divider::after{content:'';flex:1;height:1px;background:var(--borderf)}
    .ld-divider span{font-size:11px;color:var(--dim)}
    .ld-field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
    .ld-label{font-size:11.5px;font-weight:600;color:var(--sub)}
    .ld-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:11px 13px;font-size:14px;color:var(--text);outline:none;font-family:'DM Sans',sans-serif;transition:border-color 0.15s}
    .ld-input:focus{border-color:rgba(59,158,255,0.4);box-shadow:0 0 0 3px rgba(59,158,255,0.08)}
    .ld-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:9px;padding:13px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.18s;margin-top:2px}
    .ld-btn:hover{background:#5aaeff;transform:translateY(-1px)}
    .ld-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none}
    .ld-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius:8px;padding:9px 13px;font-size:12px;color:var(--red);margin-bottom:10px}
    .ld-success{background:rgba(45,212,127,0.07);border:1px solid rgba(45,212,127,0.2);border-radius:8px;padding:9px 13px;font-size:12px;color:var(--green);margin-bottom:10px}
    .ld-auth-note{font-size:11.5px;color:var(--dim);text-align:center;margin-top:14px}
    .ld-auth-note span{color:var(--blue);cursor:pointer;font-weight:600}

    /* ── TICKER ── */
    .deals-outer{overflow:hidden;padding:24px 0;border-top:1px solid var(--borderf);border-bottom:1px solid var(--borderf);background:var(--card2)}
    .deals-track{display:flex;gap:10px;width:max-content;animation:scroll 40s linear infinite}
    .deals-track:hover{animation-play-state:paused}
    .deal-chip{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--borderf);border-radius:10px;padding:10px 16px;flex-shrink:0;cursor:pointer;transition:border-color 0.15s}
    .deal-chip:hover{border-color:var(--border)}
    .dc-icon{font-size:16px}
    .dc-addr{font-size:12px;font-weight:600;color:var(--text)}
    .dc-city{font-size:10.5px;color:var(--dim);margin-top:1px}
    .dc-profit{font-size:13px;font-weight:700;min-width:72px;text-align:right}
    .dc-profit.pos{color:var(--green)}
    .dc-profit.neg{color:var(--red)}
    .dc-badge{font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:99px;white-space:nowrap}
    .dc-badge.go{background:rgba(45,212,127,0.1);color:var(--green)}
    .dc-badge.no{background:rgba(242,92,92,0.1);color:var(--red)}
    .dc-badge.warn{background:rgba(240,160,48,0.1);color:var(--amber)}
    @keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

    /* ── SECTIONS ── */
    .ld-section{max-width:1080px;margin:0 auto;padding:80px 24px}
    .ld-section-tag{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:12px;text-align:center}
    .ld-section-title{font-size:clamp(28px,3.5vw,42px);font-weight:800;letter-spacing:-1.2px;color:var(--text);margin-bottom:14px;text-align:center;line-height:1.1}
    .ld-section-title span{color:var(--blue)}
    .ld-section-sub{font-size:16px;color:var(--sub);text-align:center;max-width:520px;margin:0 auto 52px;line-height:1.7}

    /* ── FEATURES GRID ── */
    .ld-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--borderf);border-radius:18px;overflow:hidden}
    .ld-feat-cell{background:var(--card);padding:32px 28px;transition:background 0.2s}
    .ld-feat-cell:hover{background:rgba(13,17,25,0.85)}
    .ld-feat-icon{font-size:30px;margin-bottom:14px}
    .ld-feat-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
    .ld-feat-desc{font-size:13px;color:var(--sub);line-height:1.7}

    /* ── TOOLS GRID ── */
    .ld-tools-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .ld-tool-card{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:28px 24px;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;gap:10px}
    .ld-tool-card:hover{border-color:rgba(59,158,255,0.3);transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.4)}
    .ld-tool-icon{font-size:32px}
    .ld-tool-name{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
    .ld-tool-desc{font-size:13px;color:var(--sub);line-height:1.6}
    .ld-tool-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
    .ld-tool-pill{background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:99px;padding:2px 9px;font-size:10.5px;color:var(--dim)}
    .ld-tool-cta{font-size:13px;font-weight:700;color:var(--blue);margin-top:auto}

    /* ── LIVE DEMO ── */
    .ld-demo-wrap{background:var(--card);border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5)}
    .ld-demo-header{background:var(--card2);border-bottom:1px solid var(--borderf);padding:16px 24px;display:flex;align-items:center;gap:10px}
    .ld-demo-dot{width:10px;height:10px;border-radius:50%}
    .ld-demo-title{font-size:13px;font-weight:700;color:var(--sub);margin-left:8px}
    .ld-demo-body{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .ld-demo-inputs{padding:28px;border-right:1px solid var(--borderf)}
    .ld-demo-results{padding:28px}
    .ld-demo-label{font-size:11px;font-weight:700;color:var(--sub);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
    .ld-demo-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:10px 13px;font-size:15px;font-weight:600;color:var(--text);outline:none;font-family:'DM Sans',sans-serif;transition:border-color 0.15s;margin-bottom:16px}
    .ld-demo-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}
    .ld-demo-verdict{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 16px;border-radius:12px}
    .ld-demo-grade{font-size:36px;font-weight:800;line-height:1;width:48px;text-align:center}
    .ld-demo-verdict-label{font-size:18px;font-weight:800;line-height:1.2}
    .ld-demo-verdict-sub{font-size:12px;color:var(--sub);margin-top:3px}
    .ld-demo-metric-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--borderf)}
    .ld-demo-metric-row:last-child{border-bottom:none}
    .ld-demo-metric-name{font-size:13px;color:var(--sub)}
    .ld-demo-metric-val{font-size:15px;font-weight:700}
    .ld-demo-note{font-size:11px;color:var(--dim);text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--borderf)}

    /* ── TESTIMONIALS ── */
    .ld-testi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .ld-testi-card{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;gap:16px;transition:border-color 0.2s}
    .ld-testi-card:hover{border-color:rgba(59,158,255,0.2)}
    .ld-testi-stars{display:flex;gap:3px;font-size:14px}
    .ld-testi-quote{font-size:14px;color:var(--text);line-height:1.7;font-style:italic}
    .ld-testi-quote::before{content:'"';font-size:28px;color:var(--blue);line-height:0.5;vertical-align:middle;margin-right:4px}
    .ld-testi-footer{display:flex;align-items:center;gap:12px;margin-top:auto}
    .ld-testi-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0}
    .ld-testi-name{font-size:13px;font-weight:700;color:var(--text)}
    .ld-testi-role{font-size:11.5px;color:var(--sub);margin-top:1px}
    .ld-testi-deals{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--blue);font-weight:600;margin-top:3px}

    /* ── APP PREVIEW ── */
    .ld-preview{display:grid;grid-template-columns:1fr 400px;gap:60px;align-items:center}
    .ld-preview-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:14px}
    .ld-preview-title{font-size:clamp(26px,3.5vw,40px);font-weight:800;letter-spacing:-1.2px;color:var(--text);margin-bottom:14px;line-height:1.1}
    .ld-preview-title span{color:var(--blue)}
    .ld-preview-desc{font-size:14px;color:var(--sub);line-height:1.75;margin-bottom:28px}
    .ld-preview-tools{display:flex;flex-direction:column;gap:8px}
    .ld-preview-tool{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--card);border:1px solid var(--borderf);border-radius:10px;cursor:pointer;transition:all 0.15s}
    .ld-preview-tool:hover{border-color:rgba(59,158,255,0.25);background:rgba(13,17,25,0.8)}
    .ld-preview-tool-icon{font-size:16px;flex-shrink:0}
    .ld-preview-tool-name{font-size:13px;font-weight:600;color:var(--text)}
    .ld-preview-tool-desc{font-size:11.5px;color:var(--sub);margin-left:2px}
    .ld-preview-tool-tag{margin-left:auto;background:rgba(52,217,138,0.1);border:1px solid rgba(52,217,138,0.2);color:var(--green);font-size:10px;font-weight:700;border-radius:99px;padding:2px 9px}

    /* ── MOCK PANEL ── */
    .ld-mock-panel{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.6)}
    .ld-mock-header{background:var(--card2);border-bottom:1px solid var(--borderf);padding:12px 16px;display:flex;align-items:center;justify-content:space-between}
    .ld-mock-logo{font-size:14px;font-weight:800;color:var(--text)}.ld-mock-logo span{color:var(--blue)}
    .ld-mock-dots{display:flex;gap:5px}
    .ld-mock-dot{width:10px;height:10px;border-radius:50%}
    .ld-mock-hero{background:var(--card2);padding:12px 16px;border-bottom:1px solid var(--borderf)}
    .ld-mock-title{font-size:16px;font-weight:800;color:var(--text)}.ld-mock-sub{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-top:2px}
    .ld-mock-country{display:flex;gap:6px;margin-top:10px}
    .ld-mock-country-btn{flex:1;padding:7px;border-radius:7px;font-size:12px;font-weight:700;text-align:center;border:none;font-family:'DM Sans',sans-serif}
    .ld-mock-country-btn.active{background:var(--blue);color:#fff}
    .ld-mock-country-btn.inactive{background:rgba(255,255,255,0.04);color:var(--sub)}
    .ld-mock-deal{background:rgba(59,158,255,0.05);border:1px solid rgba(59,158,255,0.15);border-radius:10px;margin:12px 16px;padding:10px 12px}
    .ld-mock-deal-label{font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
    .ld-mock-deal-addr{font-size:13px;font-weight:700;color:var(--text)}.ld-mock-deal-city{font-size:11px;color:var(--sub);margin-top:1px}
    .ld-mock-tabs{display:flex;gap:0;margin:0 16px 10px;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:3px}
    .ld-mock-tab{flex:1;padding:7px 6px;border-radius:6px;font-size:10px;font-weight:600;text-align:center;cursor:pointer;border:none;font-family:'DM Sans',sans-serif}
    .ld-mock-tab.active{background:var(--blue);color:#fff}.ld-mock-tab.inactive{color:var(--sub);background:transparent}
    .ld-mock-btns{display:flex;flex-direction:column;gap:6px;margin:0 16px 12px}
    .ld-mock-btn{border-radius:9px;padding:10px 14px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;border:none;font-family:'DM Sans',sans-serif;cursor:pointer}
    .ld-mock-btn.blue{background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);color:var(--blue)}
    .ld-mock-btn.ghost{background:rgba(255,255,255,0.04);border:1px solid var(--borderf);color:var(--sub)}
    .ld-mock-btn.highlight{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);color:var(--green)}
    .ld-mock-other{padding:0 16px 16px}
    .ld-mock-other-label{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
    .ld-mock-tool-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;margin-bottom:4px;cursor:pointer;transition:background 0.15s;border:none;background:transparent;width:100%;text-align:left;font-family:'DM Sans',sans-serif}
    .ld-mock-tool-row:hover{background:rgba(255,255,255,0.04)}
    .ld-mock-tool-icon{font-size:15px}.ld-mock-tool-name{font-size:12px;font-weight:600;color:var(--sub)}

    /* ── CTA SECTION ── */
    .ld-cta{text-align:center;padding:90px 24px;border-top:1px solid var(--borderf);position:relative;overflow:hidden}
    .ld-cta::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.07) 0%,transparent 60%);pointer-events:none}
    .ld-cta h2{font-size:clamp(28px,4vw,48px);font-weight:800;letter-spacing:-1.5px;color:var(--text);margin-bottom:14px;position:relative;z-index:1;line-height:1.1}
    .ld-cta h2 span{color:var(--blue)}
    .ld-cta p{font-size:16px;color:var(--sub);margin-bottom:32px;position:relative;z-index:1}
    .ld-cta-btn{background:var(--blue);color:#fff;border:none;border-radius:10px;padding:16px 40px;font-family:'DM Sans',sans-serif;font-size:17px;font-weight:700;cursor:pointer;transition:all 0.18s;position:relative;z-index:1}
    .ld-cta-btn:hover{background:#5aabff;transform:translateY(-2px);box-shadow:0 8px 32px rgba(59,158,255,0.4)}
    .ld-cta-trust{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:20px;flex-wrap:wrap;position:relative;z-index:1}
    .ld-cta-trust-item{font-size:12px;color:var(--dim);display:flex;align-items:center;gap:5px}

    /* ── FOOTER ── */
    footer{border-top:1px solid var(--borderf);padding:24px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
    .f-logo{font-size:14px;font-weight:700;color:var(--dim)}.f-logo span{color:var(--blue)}
    .f-links{display:flex;gap:20px}
    .f-note{font-size:11.5px;color:var(--dim)}

    /* ── FADE ── */
    .fade{opacity:0;transform:translateY(20px);transition:opacity 0.65s ease,transform 0.65s ease}
    .fade.vis{opacity:1;transform:translateY(0)}

    /* ── RESPONSIVE ── */
    @media(max-width:900px){
      .ld-hero-inner{grid-template-columns:1fr;gap:40px}
      .ld-demo-body{grid-template-columns:1fr}
      .ld-demo-inputs{border-right:none;border-bottom:1px solid var(--borderf)}
      .ld-testi-grid{grid-template-columns:1fr}
      .ld-preview{grid-template-columns:1fr}
      .ld-mock-panel{max-width:380px;margin:0 auto}
      .ld-tools-grid{grid-template-columns:1fr}
      .ld-feat-grid{grid-template-columns:1fr}
      .ld-nav{padding:0 16px}
      footer{padding:20px 16px}
    }
    @media(max-width:600px){
      .ld-h1{letter-spacing:-1.5px}
      .ld-section{padding:60px 16px}
      .ld-stats{gap:20px}
    }
    input,select{font-size:16px!important}
  `;

  return (
    <>
      <style>{css}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <nav className="ld-nav">
        <div className="ld-logo"><span>Real</span> Deal</div>
        <div className="ld-nav-right">
          <button className="ld-nav-link" onClick={scrollToAuth}>Log in</button>
          <button className="ld-nav-btn" onClick={scrollToAuth}>Get started free →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="ld-hero">
        <div className="ld-glow" />
        <div className="ld-hero-inner">
          <div>
            <div className="ld-eyebrow">
              <div className="ld-eyebrow-dot" />
              Free for real estate investors — US &amp; Canada
            </div>
            <h1 className="ld-h1">Know if it's a<br /><span>real deal.</span><br />In minutes.</h1>
            <p className="ld-hero-p">Stop wasting hours on spreadsheets. Get instant property evaluation — ARV estimate, full cost breakdown, and a plain-English Go/No-Go verdict. Clarity before you commit.</p>
            <div className="ld-hero-trust">
              {["Free to use — no credit card", "Flip, BRRRR & Multifamily", "US & Canada markets"].map(t => (
                <div key={t} className="ld-trust-pill">
                  <span className="ld-trust-check">✓</span> {t}
                </div>
              ))}
            </div>
            <div className="ld-stats">
              <div><div className="ld-stat-val" id="cDeals">0</div><div className="ld-stat-lbl">Deals Analyzed</div></div>
              <div><div className="ld-stat-val" id="cProfit">$0</div><div className="ld-stat-lbl">Avg Net Profit</div></div>
              <div><div className="ld-stat-val" id="cROI">0%</div><div className="ld-stat-lbl">Avg ROI</div></div>
            </div>
          </div>

          {/* Auth Card */}
          <div className="ld-auth-card" id="auth-section">
            <div className="ld-auth-title">Start analyzing deals free</div>
            <div className="ld-auth-sub">No credit card. No setup. Instant results.</div>
            <div className="ld-tabs">
              <button className={`ld-tab ${mode === "signup" ? "active" : "inactive"}`} onClick={() => { setMode("signup"); setAuthError(""); setShowPass(false); }}>Sign up free</button>
              <button className={`ld-tab ${mode === "login" ? "active" : "inactive"}`} onClick={() => { setMode("login"); setAuthError(""); setShowPass(false); }}>Log in</button>
            </div>
            <button className="ld-google" onClick={handleGoogle}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div className="ld-divider"><span>or</span></div>
            {authError && <div className="ld-error">{authError}</div>}
            {submitted && <div className="ld-success">✅ You're in — taking you to the analyzer...</div>}
            {!submitted && (
              <form onSubmit={handleSubmit}>
                <div className="ld-field">
                  <div className="ld-label">Email</div>
                  <input className="ld-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                {mode === "signup" && !showPass ? (
                  <button type="button" className="ld-btn" onClick={() => { if (email) setShowPass(true); }}>Continue →</button>
                ) : (
                  <>
                    <div className="ld-field">
                      <div className="ld-label">Password</div>
                      <input className="ld-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    <button type="submit" className="ld-btn" disabled={authLoading}>
                      {authLoading ? "Please wait..." : mode === "signup" ? "Create free account →" : "Sign in →"}
                    </button>
                  </>
                )}
              </form>
            )}
            <div className="ld-auth-note">
              {mode === "signup"
                ? <>Already have an account? <span onClick={() => { setMode("login"); setAuthError(""); setShowPass(false); }}>Sign in</span></>
                : <>No account? <span onClick={() => { setMode("signup"); setAuthError(""); setShowPass(false); }}>Sign up free</span></>}
            </div>
          </div>
        </div>
      </section>

      {/* ── DEAL TICKER ── */}
      <div className="deals-outer"><div className="deals-track" id="dealsTrack" /></div>

      {/* ── LIVE DEMO ── */}
      <div className="ld-section fade">
        <div className="ld-section-tag">Try it right now</div>
        <h2 className="ld-section-title">Enter 4 numbers.<br /><span>Get a real answer.</span></h2>
        <p className="ld-section-sub">No sign-up needed for the preview. See exactly what you'll get — then save your full analysis.</p>
        <div className="ld-demo-wrap">
          <div className="ld-demo-header">
            <div className="ld-demo-dot" style={{ background: "#ff5f57" }} />
            <div className="ld-demo-dot" style={{ background: "#febc2e" }} />
            <div className="ld-demo-dot" style={{ background: "#28c840" }} />
            <div className="ld-demo-title">Fix &amp; Flip Quick Analyzer — Live Preview</div>
          </div>
          <div className="ld-demo-body">
            <div className="ld-demo-inputs">
              <div className="ld-demo-label">After Repair Value (ARV)</div>
              <input className="ld-demo-input" type="number" value={dArv} onChange={e => setDArv(e.target.value)} placeholder="385000" />
              <div className="ld-demo-label">Purchase Price</div>
              <input className="ld-demo-input" type="number" value={dPurchase} onChange={e => setDPurchase(e.target.value)} placeholder="250000" />
              <div className="ld-demo-label">Estimated Repair Costs</div>
              <input className="ld-demo-input" type="number" value={dRepair} onChange={e => setDRepair(e.target.value)} placeholder="55000" />
              <div className="ld-demo-label">Hold Time (months)</div>
              <input className="ld-demo-input" type="number" value={dHold} onChange={e => setDHold(e.target.value)} placeholder="6" />
              <button className="ld-btn" style={{ marginTop: 4 }} onClick={scrollToAuth}>Get full analysis free →</button>
            </div>
            <div className="ld-demo-results">
              <div className="ld-demo-verdict" style={{ background: `${dGrade.c}15`, border: `1px solid ${dGrade.c}30` }}>
                <div className="ld-demo-grade" style={{ color: dGrade.c }}>{dGrade.g}</div>
                <div>
                  <div className="ld-demo-verdict-label" style={{ color: dGrade.c }}>{dGrade.label}</div>
                  <div className="ld-demo-verdict-sub">Deal health score</div>
                </div>
              </div>
              <div className="ld-demo-metric-row">
                <span className="ld-demo-metric-name">Net Profit</span>
                <span className="ld-demo-metric-val" style={{ color: demo.profit >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(demo.profit)}</span>
              </div>
              <div className="ld-demo-metric-row">
                <span className="ld-demo-metric-name">Profit Margin</span>
                <span className="ld-demo-metric-val" style={{ color: "var(--blue)" }}>{fmtPct(demo.margin * 100)}</span>
              </div>
              <div className="ld-demo-metric-row">
                <span className="ld-demo-metric-name">All-In Cost</span>
                <span className="ld-demo-metric-val">{fmt(demo.totalCost)}</span>
              </div>
              <div className="ld-demo-metric-row">
                <span className="ld-demo-metric-name">ARV</span>
                <span className="ld-demo-metric-val">{fmt(num(dArv))}</span>
              </div>
              <div className="ld-demo-note">
                ✨ Sign up free to unlock full breakdown: financing costs, holding costs, MAO, deal score, 5-year projections, PDF export, and save deals.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHY REAL DEAL ── */}
      <div className="ld-section fade">
        <div className="ld-section-tag">Why Real Deal</div>
        <h2 className="ld-section-title">Three things that matter.<br /><span>Nothing that doesn't.</span></h2>
        <div className="ld-feat-grid">
          <div className="ld-feat-cell">
            <div className="ld-feat-icon">⚡</div>
            <div className="ld-feat-title">Instant evaluation</div>
            <div className="ld-feat-desc">Enter 4 numbers and get a full deal analysis in seconds. ARV estimate, profit margin, cost breakdown, and a clear Go/No-Go verdict — no spreadsheet needed.</div>
          </div>
          <div className="ld-feat-cell">
            <div className="ld-feat-icon">⏱️</div>
            <div className="ld-feat-title">Saves you hours</div>
            <div className="ld-feat-desc">What used to take 2 hours in Excel takes 5 minutes here. Analyze more deals, faster. Stop missing opportunities because the math took too long.</div>
          </div>
          <div className="ld-feat-cell">
            <div className="ld-feat-icon">🎯</div>
            <div className="ld-feat-title">Gives you clarity</div>
            <div className="ld-feat-desc">Plain-English reasons behind every verdict. Not just a number — "Your purchase price is $18k above MAO" is more useful than a red cell in a spreadsheet.</div>
          </div>
        </div>
      </div>

      {/* ── TOOLS ── */}
      <div className="ld-section fade" style={{ paddingTop: 0 }}>
        <div className="ld-section-tag">Your full toolkit</div>
        <h2 className="ld-section-title">Four tools.<br /><span>Every deal type covered.</span></h2>
        <p className="ld-section-sub">All free right now. Sign up and get instant access to every tool.</p>
        <div className="ld-tools-grid">
          {[
            { icon: "🏚️", name: "Fix & Flip Analyzer", desc: "Full acquisition-to-exit analysis. ARV, rehab, financing, holding, selling costs, deal score, MAO, and Go/No-Go verdict.", pills: ["ARV", "Repair Costs", "Deal Score", "MAO", "PDF Export"], cta: "Analyze a flip →", route: "/app" },
            { icon: "🔄", name: "BRRRR Calculator", desc: "Model your Buy, Rehab, Rent, Refinance, Repeat cycle. See exactly how much cash you pull out and what the property cash flows after.", pills: ["Cash Recycled", "DSCR", "Post-Refi CF", "Equity Created"], cta: "Model a BRRRR →", route: "/brrrr" },
            { icon: "🏢", name: "Multifamily Underwriter", desc: "Institutional-grade underwriting for income properties. NOI, cap rate, DSCR, cash-on-cash, GRM, 5-year projections, deal checklist.", pills: ["Cap Rate", "DSCR", "NOI", "GRM", "5-Yr Projections"], cta: "Underwrite a deal →", route: "/commercial" },
            { icon: "⚡", name: "Deal Comparison", desc: "Put two deals head-to-head. Every metric scored live — green wins, you decide. Works for flips and multifamily deals.", pills: ["Side-by-Side", "Live Scoring", "Winner Flags", "Flip & MF"], cta: "Compare deals →", route: "/compare" },
          ].map(t => (
            <div key={t.name} className="ld-tool-card" onClick={scrollToAuth}>
              <div className="ld-tool-icon">{t.icon}</div>
              <div className="ld-tool-name">{t.name}</div>
              <div className="ld-tool-desc">{t.desc}</div>
              <div className="ld-tool-pills">
                {t.pills.map(p => <span key={p} className="ld-tool-pill">{p}</span>)}
              </div>
              <div className="ld-tool-cta">{t.cta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── APP PREVIEW ── */}
      <div className="ld-section fade" style={{ paddingTop: 0 }}>
        <div className="ld-preview">
          <div>
            <div className="ld-preview-eyebrow">Built for investors, by investors</div>
            <h2 className="ld-preview-title">Your full<br /><span>investing toolkit</span><br />in one place.</h2>
            <p className="ld-preview-desc">Save deals, export PDFs, analyze properties with Google Maps satellite view, and auto-fill from public property records. Everything you need to underwrite fast and present like a pro.</p>
            <div className="ld-preview-tools">
              {[
                { icon: "🏚️", name: "Fix & Flip Analyzer", desc: "Full acquisition-to-exit analysis" },
                { icon: "🔄", name: "BRRRR Calculator", desc: "Cash recycling & refi strategy" },
                { icon: "🏢", name: "Multifamily Underwriter", desc: "Cap rate, DSCR, 5-yr projections" },
                { icon: "⚡", name: "Deal Comparison", desc: "Head-to-head metric scoring" },
              ].map(t => (
                <div key={t.name} className="ld-preview-tool" onClick={scrollToAuth}>
                  <span className="ld-preview-tool-icon">{t.icon}</span>
                  <div>
                    <div className="ld-preview-tool-name">{t.name}</div>
                    <div className="ld-preview-tool-desc">{t.desc}</div>
                  </div>
                  <span className="ld-preview-tool-tag">Free</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ld-mock-panel">
            <div className="ld-mock-header">
              <div className="ld-mock-logo"><span>Real</span> Deal</div>
              <div className="ld-mock-dots">
                <div className="ld-mock-dot" style={{ background: "#ff5f57" }} />
                <div className="ld-mock-dot" style={{ background: "#febc2e" }} />
                <div className="ld-mock-dot" style={{ background: "#28c840" }} />
              </div>
            </div>
            <div className="ld-mock-hero">
              <div className="ld-mock-title">Fix &amp; Flip Analyzer</div>
              <div className="ld-mock-sub">Real Estate Deal Calculator</div>
              <div className="ld-mock-country">
                <button className="ld-mock-country-btn active">🇺🇸 US</button>
                <button className="ld-mock-country-btn inactive">🇨🇦 CA</button>
              </div>
            </div>
            <div className="ld-mock-deal">
              <div className="ld-mock-deal-label">Current Deal</div>
              <div className="ld-mock-deal-addr">142 Birchwood Dr</div>
              <div className="ld-mock-deal-city">Calgary, AB T2X 1A4</div>
            </div>
            <div className="ld-mock-tabs">
              <button className="ld-mock-tab active">Deal Inputs</button>
              <button className="ld-mock-tab inactive">Summary</button>
              <button className="ld-mock-tab inactive">Reference</button>
            </div>
            <div className="ld-mock-btns">
              <button className="ld-mock-btn blue">📄 Export PDF</button>
              <button className="ld-mock-btn ghost">⬆ Import Deal</button>
              <button className="ld-mock-btn highlight">💾 Save Deal</button>
            </div>
            <div className="ld-mock-other">
              <div className="ld-mock-other-label">Other Tools</div>
              {[{ icon: "🏢", name: "Multifamily Underwriter" }, { icon: "🔄", name: "BRRRR Calculator" }, { icon: "⚡", name: "Deal Comparison" }, { icon: "🏠", name: "Property Hub" }].map(t => (
                <button key={t.name} className="ld-mock-tool-row">
                  <span className="ld-mock-tool-icon">{t.icon}</span>
                  <span className="ld-mock-tool-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div className="ld-section fade" style={{ paddingTop: 0 }}>
        <div className="ld-section-tag">What investors are saying</div>
        <h2 className="ld-section-title">Real investors.<br /><span>Real results.</span></h2>
        <p className="ld-section-sub">From first-time flippers to seasoned multifamily operators — here's what people are saying.</p>
        <div className="ld-testi-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="ld-testi-card">
              <div className="ld-testi-stars">{"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#f0a030" }}>{s}</span>)}</div>
              <div className="ld-testi-quote">{t.quote}</div>
              <div className="ld-testi-footer">
                <div className="ld-testi-avatar" style={{ background: t.color }}>{t.avatar}</div>
                <div>
                  <div className="ld-testi-name">{t.name}</div>
                  <div className="ld-testi-role">{t.role} · {t.location}</div>
                  <div className="ld-testi-deals">🏠 {t.deals} deals analyzed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LENDER SECTION ── */}
      <div style={{ borderTop: "1px solid var(--borderf)", borderBottom: "1px solid var(--borderf)", padding: "56px 24px", textAlign: "center", background: "var(--card2)" }} className="fade">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--blue)", marginBottom: 12 }}>Trusted Lending Partner</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10, letterSpacing: "-0.5px" }}>Got a GO verdict? <span style={{ color: "var(--blue)" }}>Get it funded.</span></div>
          <p style={{ fontSize: 14, color: "var(--sub)", marginBottom: 24, lineHeight: 1.7 }}>We work with CHMIC — a trusted private lender for fix &amp; flip and investment deals across Canada.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="mailto:kaelan@chmic.ca?subject=Real%20Deal%20Referral" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--blue)", color: "#fff", borderRadius: 9, padding: "12px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>📩 Email Kaelan at CHMIC</a>
            <a href="tel:5875854571" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--sub)", border: "1px solid var(--borderf)", borderRadius: 9, padding: "12px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>📞 587-585-4571</a>
          </div>
        </div>
      </div>

      {/* ── PRICING SECTION ── */}
      <div className="fade" style={{maxWidth:860,margin:"0 auto",padding:"0 24px 80px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(59,158,255,0.08)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:99,padding:"4px 14px",fontSize:11,fontWeight:700,color:"var(--blue)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:14}}>💰 Simple Pricing</div>
          <h2 style={{fontSize:"clamp(28px,4vw,42px)",fontWeight:800,color:"var(--text)",letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:10}}>Start free. <span style={{color:"var(--blue)"}}>Go Pro</span> when you're ready.</h2>
          <p style={{fontSize:15,color:"var(--sub)",maxWidth:480,margin:"0 auto"}}>Every tool is free during beta. Pro unlocks unlimited saves, API data, PDF reports, and priority support.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* Free Plan */}
          <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:20,padding:"32px 28px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Free</div>
            <div style={{fontSize:42,fontWeight:800,color:"var(--text)",letterSpacing:"-2px",marginBottom:4}}>$0</div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:24}}>Forever free during beta</div>
            <button onClick={scrollToAuth} style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid var(--borderf)",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"var(--text)",cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>Get started free →</button>
            {[
              "Flip, BRRRR & Multifamily calculators",
              "Property search (US & Canada)",
              "Deal Pipeline (unlimited)",
              "Quick Deal Screener",
              "Education Hub & Quiz",
              "3 saved deals",
            ].map(f => <div key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"var(--sub)",marginBottom:10}}><span style={{color:"var(--green)",flexShrink:0}}>✓</span>{f}</div>)}
          </div>
          {/* Pro Plan */}
          <div style={{background:"linear-gradient(135deg,rgba(59,158,255,0.07),var(--card))",border:"1px solid rgba(59,158,255,0.3)",borderRadius:20,padding:"32px 28px",position:"relative"}}>
            <div style={{position:"absolute",top:-12,right:20,background:"linear-gradient(135deg,#3b9eff,#a782ff)",color:"#fff",fontSize:11,fontWeight:800,padding:"4px 14px",borderRadius:99,letterSpacing:"0.5px"}}>MOST POPULAR</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--blue)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Pro</div>
            <div style={{fontSize:42,fontWeight:800,color:"var(--text)",letterSpacing:"-2px",marginBottom:4}}>$29<span style={{fontSize:16,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:24}}>Cancel anytime</div>
            <button onClick={() => navigate('/pricing')} style={{width:"100%",background:"var(--blue)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>Start Pro →</button>
            {[
              "Everything in Free",
              "Unlimited saved deals",
              "Address auto-fill from public records",
              "Rentcast sold comps + rental data",
              "Realtor.ca Canadian comps",
              "CMHC rental market data",
              "Offer Letter + Lender Package PDF",
              "Net Worth Dashboard",
              "Portfolio Tracker",
              "Priority support via chat",
            ].map(f => <div key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"var(--sub)",marginBottom:10}}><span style={{color:"var(--blue)",flexShrink:0}}>✓</span>{f}</div>)}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="ld-cta fade">
        <h2>Your next deal deserves<br />a <span>real answer.</span></h2>
        <p>Free to use. Takes 5 minutes. No credit card required.</p>
        <button className="ld-cta-btn" onClick={scrollToAuth}>Analyze my first deal free →</button>
        <div className="ld-cta-trust">
          {["✓ Free forever (launch offer)", "✓ No credit card needed", "✓ US & Canada markets", "✓ 4 tools included"].map(item => (
            <div key={item} className="ld-cta-trust-item">{item}</div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer>
        <div className="f-logo"><span>Real</span> Deal</div>
        <div className="f-links">
          <span style={{ fontSize: 12, color: "var(--dim)", cursor: "pointer" }} onClick={() => navigate('/pricing')}>Pricing</span>
          <span style={{ fontSize: 12, color: "var(--dim)", cursor: "pointer" }} onClick={scrollToAuth}>Sign up</span>
          <span style={{ fontSize: 12, color: "var(--dim)", cursor: "pointer" }} onClick={() => navigate('/privacy')}>Privacy</span>
          <span style={{ fontSize: 12, color: "var(--dim)", cursor: "pointer" }} onClick={() => navigate('/terms')}>Terms</span>
        </div>
        <div className="f-note">© 2026 realdealestate.app</div>
      </footer>
    </>
  );
}
