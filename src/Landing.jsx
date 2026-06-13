import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

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
  { name: "Marcus T.", role: "Fix & Flip Investor", location: "Calgary, AB", deals: 14, quote: "I used to spend 2 hours in Excel for every deal. Now I know in 5 minutes. Passed on 3 duds and locked in 2 great flips this quarter alone.", avatar: "M", color: "var(--blue)" },
  { name: "Priya S.", role: "BRRRR Investor", location: "Toronto, ON", deals: 7, quote: "The BRRRR calculator showed me I wasn't actually recycling my cash — I was leaving $40k locked in the deal. That one insight changed my whole strategy.", avatar: "P", color: "var(--green)" },
  { name: "Derek L.", role: "Multifamily Investor", location: "Phoenix, AZ", deals: 3, quote: "The multifamily underwriter is institutional-grade. Cap rate, DSCR, 5-year projections — everything I need to present to lenders. And it's free right now.", avatar: "D", color: "var(--purple)" },
  { name: "Jen K.", role: "Real Estate Agent", location: "Denver, CO", deals: 22, quote: "I use the Deal Comparison tool to show clients exactly why one property beats another on every metric. Closed 4 investment deals last month with it.", avatar: "J", color: "var(--amber)" },
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
  const [installOpen, setInstallOpen] = useState(false);

  // ── X-RAY UNDERWRITING BAR (landing-page "aha moment") ──
  // 'idle' → 'scanning' → 'revealed' | 'error'. Reveal shows three free
  // data points from /api/property-lookup (yearBuilt, assessedValue, zoning)
  // plus three blurred "Rize Proprietary Insights" gated behind the auth CTA.
  const [xrayAddress, setXrayAddress] = useState("");
  const [xrayState, setXrayState] = useState("idle");
  const [xrayPhase, setXrayPhase] = useState(0);
  const [xrayData, setXrayData] = useState(null);
  const [xrayError, setXrayError] = useState("");
  const [beforeAfter, setBeforeAfter] = useState(0); // 0 = chaos, 100 = clarity
  const XRAY_PHASES = [
    "▸ Geocoding address…",
    "▸ Pulling assessment + zoning bylaw…",
    "▸ Normalizing pro-forma rents (CMHC)…",
    "▸ Cross-referencing off-market comps…",
    "▸ Computing forward cap rate…",
    "▸ Running buy verdict (Newton-Raphson IRR)…",
  ];

  const runXray = async () => {
    if (xrayState === "scanning") return;
    const addr = xrayAddress.trim();
    if (!addr) {
      setXrayError("Enter an address to begin.");
      setXrayState("error");
      return;
    }
    setXrayError("");
    setXrayData(null);
    setXrayState("scanning");
    setXrayPhase(0);

    // Drive the phase ticker independent of the network call so the
    // loading sequence always reads as a deliberate, classified-terminal
    // scan even when the API returns in 200ms.
    let phase = 0;
    const tick = setInterval(() => {
      phase++;
      if (phase >= XRAY_PHASES.length - 1) {
        clearInterval(tick);
        setXrayPhase(XRAY_PHASES.length - 1);
      } else {
        setXrayPhase(phase);
      }
    }, 320);

    // Minimum perceived scan time = 1.6s — anything faster doesn't feel
    // earned and breaks the "Aha! Moment" tension.
    const start = Date.now();
    const minScanMs = 1600;

    try {
      const resp = await fetch(`/api/property-lookup?address=${encodeURIComponent(addr)}`);
      const payload = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(payload?.error || `Lookup failed (${resp.status})`);
      }

      const elapsed = Date.now() - start;
      if (elapsed < minScanMs) {
        await new Promise(r => setTimeout(r, minScanMs - elapsed));
      }
      clearInterval(tick);

      setXrayData({
        address:        payload.address || addr,
        yearBuilt:      payload.yearBuilt,
        assessedValue:  payload.assessedValue,
        propertyTaxes:  payload.propertyTaxes,
        squareFootage:  payload.squareFootage,
        zoningCode:     payload.zoning?.code,
        zoningDesc:     payload.zoning?.description,
        country:        payload.country,
        source:         payload.source,
        scanMs:         Math.max(elapsed, minScanMs),
      });
      setXrayState("revealed");
    } catch (err) {
      clearInterval(tick);
      setXrayError(err?.message || "Scan failed. Try a different address.");
      setXrayState("error");
    }
  };

  const xrayDisplayAddress = (xrayData?.address || xrayAddress.trim() || "2424 Westmount Rd NW, Calgary AB");
  const fmtUSD = (n) => (typeof n === "number" && Number.isFinite(n))
    ? "$" + Math.round(n).toLocaleString()
    : "—";

  // Lazy-load the WhyWeBuilt sizzle (3.8MB, below-the-fold).
  // Only attach src once the video element scrolls within 200px of the viewport.
  const whyVideoRef = useRef(null);
  const [whyVideoLoaded, setWhyVideoLoaded] = useState(false);
  useEffect(() => {
    if (whyVideoLoaded || !whyVideoRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // Old browsers: just load it immediately
      setWhyVideoLoaded(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setWhyVideoLoaded(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }  // start loading just before it's visible
    );
    io.observe(whyVideoRef.current);
    return () => io.disconnect();
  }, [whyVideoLoaded]);

  // Live demo state
  const [dArv, setDArv] = useState("385000");
  const [dPurchase, setDPurchase] = useState("250000");
  const [dRepair, setDRepair] = useState("55000");
  const [dHold, setDHold] = useState("6");

  const demo = useMemo(() => {
    return calcFlip(num(dArv), num(dPurchase), num(dRepair), num(dHold));
  }, [dArv, dPurchase, dRepair, dHold]);

  const dGrade = demo.margin > 0.20 ? { g: "A", c: "var(--green)", label: "✅ Strong GO" }
    : demo.margin > 0.12 ? { g: "B", c: "var(--blue)", label: "✅ GO" }
    : demo.margin > 0.05 ? { g: "C", c: "var(--amber)", label: "⚠️ Caution" }
    : { g: "F", c: "var(--red)", label: "🚫 No-Go" };

  // Previously: auto-redirected logged-in users to /analyze. Removed so the
  // hero is always visible — sharing the landing as a demo/investor link
  // shouldn't require the recipient to be signed out. Logged-in users can
  // still jump into the app via the nav's "Dashboard" button.

  useEffect(() => {
    // Animate counters in once, then keep cDeals ticking up so the page feels alive.
    let deals = 4180, profit = 47300, roi = 14.8;
    let liveTimer = null;

    setTimeout(() => {
      [['cDeals', deals, 2400, '', '', false], ['cProfit', profit, 2800, '$', '', false], ['cROI', roi, 2200, '', '%', true]].forEach(([id, to, dur, pre, suf, dec]) => {
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

      // Live tick — every 5-12s a new "deal" lands. Brief flash to draw the eye.
      const dealsEl = document.getElementById('cDeals');
      const profitEl = document.getElementById('cProfit');
      function tick() {
        deals += 1;
        // Drift profit average within ±$80 each tick — feels organic
        profit += Math.round((Math.random() - 0.45) * 160);
        if (dealsEl) {
          dealsEl.textContent = deals.toLocaleString();
          dealsEl.style.transition = 'color 0.18s, transform 0.18s';
          dealsEl.style.color = 'var(--green)';
          dealsEl.style.transform = 'translateY(-2px)';
          setTimeout(() => {
            dealsEl.style.color = '';
            dealsEl.style.transform = '';
          }, 700);
        }
        if (profitEl) profitEl.textContent = '$' + profit.toLocaleString();
        const next = 5000 + Math.random() * 7000;
        liveTimer = setTimeout(tick, next);
      }
      liveTimer = setTimeout(tick, 4000);
    }, 500);

    // Deal ticker
    const track = document.getElementById('dealsTrack');
    if (track) {
      [...DEALS, ...DEALS].forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'deal-chip';
        const trendGlyph = d.profit > 0 ? '▲' : '▼';
        const badge = d.verdict === 'go' ? '[ GO ]' : d.verdict === 'no' ? '[ PASS ]' : '[ HOLD ]';
        chip.innerHTML = `<div class="dc-icon" style="font-family:'Geist Mono',monospace;font-size:10px;color:var(--blue);font-weight:700;letter-spacing:0.5px">${d.addr.split(' ')[0]}</div><div><div class="dc-addr">${d.addr}</div><div class="dc-city">${d.city} · CoC ${d.coc.toFixed(1)}%</div></div><div class="dc-profit ${d.profit > 0 ? 'pos' : 'neg'}">${trendGlyph} ${fmt(d.profit)}</div><div class="dc-badge ${d.verdict}">${badge}</div>`;
        track.appendChild(chip);
      });
    }

    // Scroll reveal
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { threshold: 0.06 });
    document.querySelectorAll('.fade').forEach(el => io.observe(el));
    return () => {
      io.disconnect();
      if (liveTimer) clearTimeout(liveTimer);
    };
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
    /* ── FAMILY OFFICE PALETTE — Landing page only ──
       Deep navy + royal blue + brushed brass. Overrides every global token
       inside the .ld-page scope so existing classes inherit the new
       aesthetic without rewriting individual rules. Rest of the app stays
       on the white-mode tokens defined in index.css. */
    .ld-page{
      --navy:        #0a1128;
      --navy-2:      #001c3d;
      --navy-3:      #0f1e3f;
      --royal:       #2155cd;
      --royal-2:     #0047ab;
      --brass:       #d4af37;
      --brass-2:     #c6a664;
      --alabaster:   #f0f0f0;
      --alabaster-2: #d4d8e0;
      --alabaster-3: #8a93a8;

      /* override global tokens so every .ld-* class adopts navy/royal/brass */
      --bg:       #0a1128;
      --card:     rgba(255,255,255,0.04);
      --card2:    rgba(255,255,255,0.025);
      --text:     #f0f0f0;
      --sub:      #d4d8e0;
      --dim:      #8a93a8;
      --blue:     #2155cd;
      --gold:     #d4af37;
      --border:   rgba(212,175,55,0.22);
      --borderf:  rgba(255,255,255,0.08);
      --green:    #2dd47f;
      --red:      #f25c5c;
      --amber:    #f0a030;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    .ld-page{background:var(--navy);color:var(--alabaster);font-family:'Geist',sans-serif;font-size:15px;line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased;min-height:100vh}
    body:has(.ld-page){background:var(--navy)}

    /* ── NAV ── */
    .ld-nav{position:fixed;top:0;left:0;right:0;z-index:200;height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;background:rgba(10,17,40,0.78);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(212,175,55,0.12)}
    .ld-logo{font-size:16px;font-weight:800;color:var(--alabaster);letter-spacing:-0.3px;text-decoration:none}
    .ld-logo span{color:var(--brass)}
    .ld-nav-right{display:flex;align-items:center;gap:10px}
    .ld-nav-link{font-size:13px;color:var(--alabaster-2);cursor:pointer;font-weight:500;padding:6px 12px;border-radius:7px;background:none;border:none;font-family:'Geist',sans-serif;transition:color 0.15s}
    .ld-nav-link:hover{color:var(--alabaster)}
    .ld-nav-btn{background:var(--royal);color:#fff;border:1px solid var(--brass);border-radius:4px;padding:8px 18px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px}
    .ld-nav-btn:hover{background:var(--royal-2);transform:translateY(-1px);box-shadow:0 8px 24px rgba(212,175,55,0.25)}

    /* ── HERO ── */
    .ld-hero{min-height:100vh;display:flex;align-items:stretch;justify-content:center;padding:0;position:relative;overflow:hidden;background:#0f172a}
    .ld-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(0,102,204,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,102,204,0.06) 1px,transparent 1px);background-size:56px 56px;pointer-events:none;z-index:2}
    /* ── Full-bleed video as cover — letterbox treatment ──
       Video plays SHARP and unblurred (it IS the proof — that's the
       actual product walkthrough). Gradients at the top + bottom create
       framed zones where the H1 and the activity feed sit. The middle
       of the viewport stays clean — video plays unobscured. */
    .ld-hero-bgvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0.92}
    /* Top frame: deep navy ~70-90% fades down → transparent mid-frame */
    .ld-hero-bgvid-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,17,40,0.92) 0%,rgba(10,17,40,0.78) 18%,rgba(10,17,40,0.32) 32%,rgba(10,17,40,0.08) 45%,rgba(10,17,40,0.12) 60%,rgba(10,17,40,0.7) 80%,rgba(10,17,40,0.98) 100%);z-index:1;pointer-events:none}
    /* Brand bokeh — royal blue glow at center-top, brushed brass at lower-right */
    .ld-hero-bgvid-tint{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 8%,rgba(33,85,205,0.28) 0%,transparent 38%),radial-gradient(ellipse at 90% 95%,rgba(212,175,55,0.14) 0%,transparent 42%);z-index:1;pointer-events:none}
    .ld-glow{position:absolute;top:20%;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(33,85,205,0.14) 0%,transparent 65%);pointer-events:none;animation:breathe 5s ease-in-out infinite}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:0.55}}
    .ld-hero-inner{max-width:1320px;width:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:space-between;gap:28px;position:relative;z-index:3;min-height:100vh;padding:96px 24px 56px}
    .ld-hero-head{text-align:center;max-width:820px;margin:0 auto}
    .ld-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--brass);margin-bottom:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(10,17,40,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px}
    .ld-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;flex-shrink:0;box-shadow:0 0 10px var(--brass)}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    .ld-h1{font-size:clamp(40px,6vw,72px);font-weight:800;line-height:1.02;letter-spacing:-2.8px;color:var(--alabaster);margin-bottom:18px;text-shadow:0 6px 28px rgba(0,0,0,0.7),0 1px 0 rgba(0,0,0,0.5)}
    .ld-h1 span{color:var(--brass);text-shadow:0 6px 32px rgba(212,175,55,0.3),0 6px 28px rgba(0,0,0,0.7);font-style:italic;font-weight:700}
    .ld-hero-p{font-size:17px;color:var(--alabaster-2);line-height:1.7;margin:0 auto;max-width:620px;text-shadow:0 2px 16px rgba(0,0,0,0.6)}
    .ld-hero-foot{display:flex;flex-direction:column;gap:16px;align-items:center;max-width:980px;margin:0 auto;width:100%}
    .ld-hero-trust{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;margin-bottom:0}
    .ld-trust-pill{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--alabaster-2);font-weight:500;font-family:'Geist Mono',ui-monospace,monospace;border:1px solid rgba(212,175,55,0.22);border-radius:4px;padding:6px 11px;background:rgba(10,17,40,0.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);letter-spacing:0.1px}
    .ld-trust-pill:hover{border-color:var(--brass);background:rgba(212,175,55,0.08)}

    /* Live activity strip */
    .ld-activity{background:rgba(0,12,31,0.78);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid rgba(212,175,55,0.22);border-radius:6px;padding:0;margin:0 auto;width:100%;max-width:720px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,0.55),0 0 0 1px rgba(212,175,55,0.05)}
    .ld-activity-head{padding:8px 14px;background:rgba(33,85,205,0.18);border-bottom:1px solid rgba(212,175,55,0.18);font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--alabaster);letter-spacing:1.2px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
    .ld-activity-glyph{color:var(--brass);animation:blink 2s infinite}
    .ld-activity-rows{display:flex;flex-direction:column}
    .ld-activity-row{display:grid;grid-template-columns:50px 1fr 70px 70px;gap:12px;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.05);font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;transition:background 0.15s;color:var(--alabaster-2)}
    .ld-activity-row:last-child{border-bottom:none}
    .ld-activity-row:hover{background:rgba(212,175,55,0.04)}
    .ld-ar-time{color:var(--dim);font-size:10.5px}
    .ld-ar-addr{color:var(--text);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ld-ar-tag{font-size:9.5px;font-weight:700;letter-spacing:0.6px;padding:2px 6px;border-radius:3px;border:1px solid currentColor;text-align:center}
    .ld-ar-tag.go{color:var(--green);background:rgba(52,217,138,0.06)}
    .ld-ar-tag.no{color:var(--red);background:rgba(242,92,92,0.06)}
    .ld-ar-roi{text-align:right;font-weight:700;font-size:11.5px}
    .ld-ar-roi.pos{color:var(--green)}
    .ld-ar-roi.neg{color:var(--red)}
    .ld-trust-check{color:var(--green);font-size:14px}
    .ld-stats{display:flex;gap:32px;flex-wrap:wrap}
    .ld-stat-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:24px;font-weight:700;color:var(--brass);letter-spacing:-0.3px;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,0.5)}
    .ld-stat-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:600;color:var(--alabaster-2);letter-spacing:1.2px;text-transform:uppercase;margin-top:5px;display:flex;align-items:center;gap:5px}
    .ld-stat-lbl::before{content:"▸";color:var(--brass);font-size:8px}
    .ld-stats{display:flex;gap:32px;flex-wrap:wrap;justify-content:center;margin-top:4px}

    /* ── WHY WE BUILT — motion-graphic sizzle reel section ── */
    .ld-why{padding:80px 24px 40px;position:relative;background:linear-gradient(180deg,transparent,rgba(52,217,138,0.025),transparent)}
    .ld-why-inner{max-width:1320px;margin:0 auto;display:flex;flex-direction:column;gap:32px}
    .ld-why-head{text-align:center;max-width:760px;margin:0 auto}
    .ld-whyvid{background:var(--card);border:1px solid var(--border);border-left:4px solid var(--green);border-radius: 6px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(52,217,138,0.06) inset}

    /* ── HERO DEMO VIDEO (replaces auth card in hero) ── */
    .ld-herovid{background:var(--card);border:1px solid var(--border);border-radius: 6px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(52,217,138,0.06) inset}
    .ld-herovid-bar{display:flex;align-items:center;gap:10px;padding:9px 16px;background:rgba(15,23,42,0.025);border-bottom:1px solid var(--borderf);font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--sub)}
    .ld-herovid-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 2s infinite}
    .ld-herovid-bar-label{color:var(--text);flex:1}
    .ld-herovid-bar-status{color:var(--green)}
    .ld-herovid-cta{display:block;text-align:center;padding:11px 14px;background:rgba(52,217,138,0.06);color:var(--green);border-top:1px solid var(--borderf);font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:0.6px;text-decoration:none;transition:background 0.15s}
    .ld-herovid-cta:hover{background:rgba(52,217,138,0.12)}

    /* ── HERO MINI-CALC (relocated to /#try-it-live section) ── */
    .ld-hcalc{background:var(--card);border:1px solid var(--border);border-radius: 6px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(59,158,255,0.04) inset;font-family:'Geist Mono',ui-monospace,monospace}
    .ld-hcalc-bar{display:flex;align-items:center;gap:10px;padding:9px 16px;background:rgba(15,23,42,0.025);border-bottom:1px solid var(--borderf);font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--sub)}
    .ld-hcalc-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 2s infinite}
    .ld-hcalc-bar-label{color:var(--text);flex:1}
    .ld-hcalc-bar-status{color:var(--green)}
    .ld-hcalc-sub{padding:12px 16px 6px;font-family:'Geist',sans-serif;font-size:13px;color:var(--sub);line-height:1.5;border-bottom:1px solid var(--borderf)}
    .ld-hcalc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px;background:rgba(255,255,255,0.012)}
    .ld-hcalc-field{display:flex;flex-direction:column;gap:4px}
    .ld-hcalc-lbl{font-size:9.5px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.7px}
    .ld-hcalc-input{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:4px;padding:9px 11px;font-size:14px;color:var(--text);outline:none;font-family:'Geist Mono',ui-monospace,monospace;font-weight:600;letter-spacing:-0.2px;transition:border-color 0.15s,background 0.15s}
    .ld-hcalc-input:focus{border-color:rgba(59,158,255,0.45);background:rgba(59,158,255,0.04)}
    .ld-hcalc-verdict{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--borderf);border-bottom:1px solid var(--borderf);border:1px solid var(--borderf);transition:background 0.2s,border-color 0.15s}
    .ld-hcalc-grade{font-size:32px;font-weight:800;line-height:1;width:44px;height:44px;border:1.5px solid currentColor;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Geist',sans-serif;letter-spacing:-1px;flex-shrink:0}
    .ld-hcalc-verdict-lbl{font-family:'Geist',sans-serif;font-size:15px;font-weight:800;letter-spacing:-0.3px;line-height:1.2}
    .ld-hcalc-verdict-sub{font-family:'Geist',sans-serif;font-size:11.5px;color:var(--sub);margin-top:3px;line-height:1.3}
    .ld-hcalc-verdict-roi{font-size:14px;font-weight:700;text-align:right;letter-spacing:0.2px;white-space:nowrap}
    .ld-hcalc-rows{padding:6px 16px 12px;display:flex;flex-direction:column}
    .ld-hcalc-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed rgba(15,23,42,0.04);font-size:12.5px}
    .ld-hcalc-row:last-child{border-bottom:none}
    .ld-hcalc-row span:first-child{color:var(--sub);font-family:'Geist',sans-serif;font-weight:500;font-size:12px}
    .ld-hcalc-row span:last-child{color:var(--text);font-weight:700;letter-spacing:-0.2px}
    .ld-hcalc-row .pos{color:var(--green)}.ld-hcalc-row .neg{color:var(--red)}
    .ld-hcalc-cta{display:block;text-align:center;margin:10px 14px 6px;padding:13px 14px;background:linear-gradient(135deg,var(--blue),#2980e8);color:#fff;border-radius:6px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:-0.1px;transition:transform 0.15s,box-shadow 0.15s}
    .ld-hcalc-cta:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(59,158,255,0.35)}
    .ld-hcalc-foot{text-align:center;padding:6px 14px 14px;font-family:'Geist',sans-serif;font-size:11px;color:var(--dim)}

    /* ── AUTH SECTION (relocated below hero) ── */
    .ld-auth-section{padding:60px 24px;display:flex;justify-content:center;background:linear-gradient(180deg,rgba(59,158,255,0.025),transparent)}

    /* ── AUTH CARD ── */
    .ld-auth-card{background:var(--card);border:1px solid var(--border);border-radius: 16px;padding:32px 28px;box-shadow:0 24px 80px rgba(0,0,0,0.55);width:100%;max-width:420px}
    .ld-auth-title{font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px;letter-spacing:-0.3px}
    .ld-auth-sub{font-size:13px;color:var(--sub);margin-bottom:22px}
    .ld-tabs{display:flex;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:3px;gap:3px;margin-bottom:20px}
    .ld-tab{flex:1;padding:8px 0;border:none;border-radius:7px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s}
    .ld-tab.active{background:var(--blue);color:#fff}
    .ld-tab.inactive{background:transparent;color:var(--sub)}
    .ld-google{width:100%;background:rgba(15,23,42,0.05);border:1px solid var(--borderf);border-radius:10px;padding:12px;font-family:'Geist',sans-serif;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.15s;margin-bottom:4px}
    .ld-google:hover{background:rgba(255,255,255,0.09);border-color:var(--border)}
    .ld-divider{display:flex;align-items:center;gap:10px;margin:14px 0}
    .ld-divider::before,.ld-divider::after{content:'';flex:1;height:1px;background:var(--borderf)}
    .ld-divider span{font-size:11px;color:var(--dim)}
    .ld-field{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
    .ld-label{font-size:11.5px;font-weight:600;color:var(--sub)}
    .ld-input{width:100%;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:11px 13px;font-size:14px;color:var(--text);outline:none;font-family:'Geist',sans-serif;transition:border-color 0.15s}
    .ld-input:focus{border-color:rgba(59,158,255,0.4);box-shadow:0 0 0 3px rgba(59,158,255,0.08)}
    .ld-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius: 10px;padding:13px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.15s;margin-top:2px}
    .ld-btn:hover{background:#5aaeff;transform:translateY(-1px)}
    .ld-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none}
    .ld-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius: 6px;padding:9px 13px;font-size:12px;color:var(--red);margin-bottom:10px}
    .ld-success{background:rgba(45,212,127,0.07);border:1px solid rgba(45,212,127,0.2);border-radius: 6px;padding:9px 13px;font-size:12px;color:var(--green);margin-bottom:10px}
    .ld-auth-note{font-size:11.5px;color:var(--dim);text-align:center;margin-top:14px}
    .ld-auth-note span{color:var(--blue);cursor:pointer;font-weight:600}

    /* ── TICKER ── */
    .deals-outer{overflow:hidden;padding:24px 0;border-top:1px solid var(--borderf);border-bottom:1px solid var(--borderf);background:var(--card2)}
    .deals-track{display:flex;gap:10px;width:max-content;animation:scroll 40s linear infinite}
    .deals-track:hover{animation-play-state:paused}
    .deal-chip{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--borderf);border-radius:4px;padding:10px 14px;flex-shrink:0;cursor:pointer;transition:border-color 0.15s}
    .deal-chip:hover{border-color:var(--blue)}
    .dc-icon{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--blue);font-weight:700;letter-spacing:0.6px;padding-right:10px;border-right:1px solid var(--borderf)}
    .dc-addr{font-size:12px;font-weight:600;color:var(--text)}
    .dc-city{font-size:10px;color:var(--dim);margin-top:1px;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.3px}
    .dc-profit{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:700;min-width:90px;text-align:right;letter-spacing:0.2px}
    .dc-profit.pos{color:var(--green)}
    .dc-profit.neg{color:var(--red)}
    .dc-badge{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:3px;white-space:nowrap;letter-spacing:0.6px;border:1px solid currentColor}
    .dc-badge.go{background:rgba(45,212,127,0.08);color:var(--green)}
    .dc-badge.no{background:rgba(242,92,92,0.08);color:var(--red)}
    .dc-badge.warn{background:rgba(240,160,48,0.08);color:var(--amber)}
    @keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

    /* ── SECTIONS ── */
    .ld-section{max-width:1080px;margin:0 auto;padding:80px 24px}
    .ld-section-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--blue);margin-bottom:12px;text-align:center}
    .ld-section-tag::before{content:"// "}
    .ld-section-title{font-size:clamp(28px,3.5vw,42px);font-weight:800;letter-spacing:-1.2px;color:var(--text);margin-bottom:14px;text-align:center;line-height:1.1}
    .ld-section-title span{color:var(--blue)}
    .ld-section-sub{font-size:16px;color:var(--sub);text-align:center;max-width:520px;margin:0 auto 52px;line-height:1.7}

    /* ── FEATURES GRID ── */
    .ld-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--borderf);border-radius: 16px;overflow:hidden}
    .ld-feat-cell{background:var(--card);padding:32px 28px;transition:background 0.15s}
    .ld-feat-cell:hover{background:rgba(13,17,25,0.85)}
    .ld-feat-icon{font-size:30px;margin-bottom:14px}
    .ld-feat-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
    .ld-feat-desc{font-size:13px;color:var(--sub);line-height:1.7}

    /* ── TOOLS GRID ── */
    .ld-tools-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .ld-tool-card{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:28px 24px;cursor:pointer;transition:all 0.15s;display:flex;flex-direction:column;gap:10px}
    .ld-tool-card:hover{border-color:rgba(59,158,255,0.3);transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.4)}
    .ld-tool-icon{font-size:32px}
    .ld-tool-name{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.3px}
    .ld-tool-desc{font-size:13px;color:var(--sub);line-height:1.6}
    .ld-tool-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
    .ld-tool-pill{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:99px;padding:2px 9px;font-size:10.5px;color:var(--dim)}
    .ld-tool-cta{font-size:13px;font-weight:700;color:var(--blue);margin-top:auto}

    /* ── LIVE DEMO ── */
    .ld-demo-wrap{background:var(--card);border:1px solid var(--border);border-radius: 16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5)}
    .ld-demo-header{background:var(--card2);border-bottom:1px solid var(--borderf);padding:16px 24px;display:flex;align-items:center;gap:10px}
    .ld-demo-dot{width:10px;height:10px;border-radius:50%}
    .ld-demo-title{font-size:13px;font-weight:700;color:var(--sub);margin-left:8px}
    .ld-demo-body{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .ld-demo-inputs{padding:28px;border-right:1px solid var(--borderf)}
    .ld-demo-results{padding:28px}
    .ld-demo-label{font-size:11px;font-weight:700;color:var(--sub);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px}
    .ld-demo-input{width:100%;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:10px 13px;font-size:15px;font-weight:600;color:var(--text);outline:none;font-family:'Geist',sans-serif;transition:border-color 0.15s;margin-bottom:16px}
    .ld-demo-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}
    .ld-demo-verdict{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 16px;border-radius: 10px}
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
    .ld-testi-card{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;gap:16px;transition:border-color 0.15s}
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
    .ld-mock-panel{background:var(--card);border:1px solid var(--border);border-radius: 16px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.6)}
    .ld-mock-header{background:var(--card2);border-bottom:1px solid var(--borderf);padding:12px 16px;display:flex;align-items:center;justify-content:space-between}
    .ld-mock-logo{font-size:14px;font-weight:800;color:var(--text)}.ld-mock-logo span{color:var(--blue)}
    .ld-mock-dots{display:flex;gap:5px}
    .ld-mock-dot{width:10px;height:10px;border-radius:50%}
    .ld-mock-hero{background:var(--card2);padding:12px 16px;border-bottom:1px solid var(--borderf)}
    .ld-mock-title{font-size:16px;font-weight:800;color:var(--text)}.ld-mock-sub{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-top:2px}
    .ld-mock-country{display:flex;gap:6px;margin-top:10px}
    .ld-mock-country-btn{flex:1;padding:7px;border-radius:7px;font-size:12px;font-weight:700;text-align:center;border:none;font-family:'Geist',sans-serif}
    .ld-mock-country-btn.active{background:var(--blue);color:#fff}
    .ld-mock-country-btn.inactive{background:rgba(15,23,42,0.04);color:var(--sub)}
    .ld-mock-deal{background:rgba(59,158,255,0.05);border:1px solid rgba(59,158,255,0.15);border-radius:10px;margin:12px 16px;padding:10px 12px}
    .ld-mock-deal-label{font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
    .ld-mock-deal-addr{font-size:13px;font-weight:700;color:var(--text)}.ld-mock-deal-city{font-size:11px;color:var(--sub);margin-top:1px}
    .ld-mock-tabs{display:flex;gap:0;margin:0 16px 10px;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:3px}
    .ld-mock-tab{flex:1;padding:7px 6px;border-radius:6px;font-size:10px;font-weight:600;text-align:center;cursor:pointer;border:none;font-family:'Geist',sans-serif}
    .ld-mock-tab.active{background:var(--blue);color:#fff}.ld-mock-tab.inactive{color:var(--sub);background:transparent}
    .ld-mock-btns{display:flex;flex-direction:column;gap:6px;margin:0 16px 12px}
    .ld-mock-btn{border-radius: 10px;padding:10px 14px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;border:none;font-family:'Geist',sans-serif;cursor:pointer}
    .ld-mock-btn.blue{background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);color:var(--blue)}
    .ld-mock-btn.ghost{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);color:var(--sub)}
    .ld-mock-btn.highlight{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);color:var(--green)}
    .ld-mock-other{padding:0 16px 16px}
    .ld-mock-other-label{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
    .ld-mock-tool-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius: 6px;margin-bottom:4px;cursor:pointer;transition:background 0.15s;border:none;background:transparent;width:100%;text-align:left;font-family:'Geist',sans-serif}
    .ld-mock-tool-row:hover{background:rgba(15,23,42,0.04)}
    .ld-mock-tool-icon{font-size:15px}.ld-mock-tool-name{font-size:12px;font-weight:600;color:var(--sub)}

    /* ── ANATOMY OF A DEAL ── */
    .ld-anatomy{padding:80px 24px;border-top:1px solid var(--borderf);background:linear-gradient(180deg,transparent,rgba(59,158,255,0.012),transparent);position:relative}
    .ld-anatomy-inner{max-width:1140px;margin:0 auto}
    .ld-anatomy-head{text-align:center;margin-bottom:48px}
    .ld-anatomy-deal-bar{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;background:var(--card);border:1px solid var(--borderf);border-left:3px solid var(--blue);border-radius:4px;margin-top:18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--text);letter-spacing:0.5px;font-weight:600}
    .ld-anatomy-steps{display:flex;flex-direction:column;gap:32px}
    .ld-anatomy-step{display:grid;grid-template-columns:300px 1fr;gap:36px;align-items:start}
    .ld-anatomy-left{padding-top:8px}
    .ld-anatomy-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--blue);letter-spacing:2px;margin-bottom:10px}
    .ld-anatomy-title{font-family:'Geist',sans-serif;font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.8px;line-height:1.2;margin-bottom:10px}
    .ld-anatomy-desc{font-size:13.5px;color:var(--sub);line-height:1.7}
    .ld-anatomy-right{background:var(--card);border:1px solid var(--border);border-radius: 6px;overflow:hidden;box-shadow:0 18px 56px rgba(0,0,0,0.45)}
    .ld-an-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(15,23,42,0.025);border-bottom:1px solid var(--borderf);font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--blue);letter-spacing:1.2px;text-transform:uppercase}
    .ld-an-bar-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 2s infinite;flex-shrink:0}
    .ld-an-bar-tag{margin-left:auto;color:var(--green)}
    .ld-an-body{padding:20px}
    .ld-an-metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
    .ld-an-metric{background:rgba(15,23,42,0.025);border:1px solid var(--borderf);border-radius:4px;padding:12px}
    .ld-an-metric-lbl{font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:700;color:var(--dim);letter-spacing:1px;text-transform:uppercase}
    .ld-an-metric-val{font-family:'Geist Mono',monospace;font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-top:4px}
    .ld-an-table{margin-top:10px;background:rgba(255,255,255,0.02);border:1px solid var(--borderf);border-radius:4px;overflow-x:auto;font-family:'Geist Mono',monospace;font-size:12px;-webkit-overflow-scrolling:touch}
    .ld-an-table-head{display:grid;grid-template-columns:1.6fr repeat(5,1fr);padding:8px 14px;font-size:9.5px;font-weight:700;color:var(--dim);letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--borderf);min-width:520px}
    .ld-an-table-row{display:grid;grid-template-columns:1.6fr repeat(5,1fr);padding:7px 14px;min-width:520px}
    .ld-an-table-row.bold{background:rgba(52,217,138,0.05);font-weight:700;color:var(--green)}
    .ld-an-table-row:not(:last-child){border-bottom:1px solid rgba(15,23,42,0.04)}
    .ld-an-thesis{padding:18px;background:linear-gradient(135deg,rgba(52,217,138,0.08),rgba(59,158,255,0.03));border-radius:6px;border:1px solid rgba(52,217,138,0.2)}
    .ld-an-thesis-bar{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .ld-an-thesis-text{font-family:'Geist',sans-serif;font-size:14px;color:var(--text);line-height:1.65;letter-spacing:-0.1px}
    .ld-an-output-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
    .ld-an-output-chip{display:flex;align-items:center;gap:8px;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:6px;padding:10px 14px;font-family:'Geist',sans-serif;font-size:13px;font-weight:600;color:var(--text);flex:1;min-width:160px}
    .ld-an-output-icon{font-size:16px}

    /* ── PRO OUTPUTS SHOWCASE ── */
    .ld-pro{padding:60px 24px 80px}
    .ld-pro-inner{max-width:1140px;margin:0 auto}
    .ld-pro-head{text-align:center;margin-bottom:44px}
    .ld-pro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .ld-pro-card{background:var(--card);border:1px solid var(--borderf);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s, border-color 0.2s, box-shadow 0.15s;cursor:pointer}
    .ld-pro-card:hover{transform:translateY(-4px);border-color:rgba(59,158,255,0.3);box-shadow:0 24px 56px rgba(0,0,0,0.5)}
    .ld-pro-doc{aspect-ratio:8.5/11;background:#f6f5f0;color:#1a1a1a;font-family:'Georgia',serif;position:relative;overflow:hidden;border-bottom:1px solid var(--borderf)}
    .ld-pro-doc-header{background:#ffffff;color:var(--text);padding:11px 18px;display:flex;align-items:center;justify-content:space-between;font-family:'Geist',sans-serif}
    .ld-pro-doc-logo{font-size:11px;font-weight:800;letter-spacing:0.3px}.ld-pro-doc-logo span{color:var(--blue)}
    .ld-pro-doc-type{font-family:'Geist Mono',monospace;font-size:9px;font-weight:700;color:var(--blue);letter-spacing:1.2px;text-transform:uppercase}
    .ld-pro-doc-body{padding:18px 22px;font-size:9.5px;line-height:1.5;color:#1a1a1a}
    .ld-pro-doc-title{font-size:14px;font-weight:700;color:#0a0a0a;margin-bottom:4px;font-family:'Geist',sans-serif;letter-spacing:-0.3px}
    .ld-pro-doc-sub{font-size:8.5px;color:#666;margin-bottom:12px;font-family:'Geist',sans-serif;letter-spacing:0.3px}
    .ld-pro-doc-section{font-size:8px;font-weight:700;color:#0a0a0a;text-transform:uppercase;letter-spacing:1.2px;margin:14px 0 6px;font-family:'Geist',sans-serif;border-bottom:1px solid #c8c6bc;padding-bottom:3px}
    .ld-pro-doc-row{display:flex;justify-content:space-between;padding:3px 0;font-family:'Geist Mono',monospace;font-size:8.5px;color:#1a1a1a}
    .ld-pro-doc-row span:last-child{font-weight:700}
    .ld-pro-doc-para{font-size:8px;color:#333;line-height:1.6;margin-top:4px;font-family:'Georgia',serif}
    .ld-pro-doc-footer{position:absolute;bottom:0;left:0;right:0;padding:7px 22px;background:#eeebe0;font-size:7px;color:#888;display:flex;justify-content:space-between;font-family:'Geist',sans-serif;letter-spacing:0.3px}
    .ld-pro-doc-watermark{position:absolute;right:14px;top:54px;font-size:7.5px;font-weight:700;color:rgba(59,158,255,0.55);font-family:'Geist Mono',monospace;letter-spacing:1px;transform:rotate(-7deg);border:1px solid rgba(59,158,255,0.45);padding:3px 7px;border-radius:2px;background:rgba(255,255,255,0.5)}
    .ld-pro-doc-bar{height:6px;background:var(--blue);margin:6px 0 8px;border-radius:2px;width:60%}
    .ld-pro-meta{padding:18px}
    .ld-pro-meta-tag{font-family:'Geist Mono',monospace;font-size:10px;font-weight:700;color:var(--blue);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px}
    .ld-pro-meta-title{font-family:'Geist',sans-serif;font-size:16px;font-weight:800;color:var(--text);letter-spacing:-0.3px;margin-bottom:6px}
    .ld-pro-meta-desc{font-size:12.5px;color:var(--sub);line-height:1.6}
    .ld-pro-meta-cta{font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;color:var(--green);letter-spacing:0.8px;text-transform:uppercase;margin-top:12px;display:flex;align-items:center;gap:6px}

    /* ── FULL TOOLKIT GRID ── */
    .ld-toolkit{padding:80px 24px 60px;border-top:1px solid var(--borderf)}
    .ld-toolkit-inner{max-width:1140px;margin:0 auto}
    .ld-toolkit-head{text-align:center;margin-bottom:40px}
    .ld-toolkit-cat{margin-bottom:28px}
    .ld-toolkit-cat-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--borderf);flex-wrap:wrap}
    .ld-toolkit-cat-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase}
    .ld-toolkit-cat-count{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:500;color:var(--dim);letter-spacing:0.8px}
    .ld-toolkit-cat-sub{flex:1;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--sub);font-weight:500;text-align:right}
    .ld-toolkit-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:10px}
    .ld-toolkit-card{background:var(--card);border:1px solid var(--borderf);border-radius:7px;padding:14px 16px;cursor:pointer;transition:transform 0.18s,border-color 0.18s,box-shadow 0.15s;display:flex;flex-direction:column;gap:6px;text-decoration:none}
    .ld-toolkit-card:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,0,0,0.45)}
    .ld-toolkit-card-row{display:flex;align-items:center;gap:10px}
    .ld-toolkit-card-icon{font-size:20px;line-height:1}
    .ld-toolkit-card-name{font-family:'Geist',sans-serif;font-size:14px;font-weight:800;color:var(--text);letter-spacing:-0.2px;flex:1}
    .ld-toolkit-card-arrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--dim);transition:transform 0.15s}
    .ld-toolkit-card:hover .ld-toolkit-card-arrow{transform:translateX(3px)}
    .ld-toolkit-card-desc{font-size:12px;color:var(--sub);line-height:1.5}

    /* ── CHROME EXTENSION SHOWCASE ── */
    .ld-chrome{padding:60px 24px 80px;border-top:1px solid var(--borderf);background:linear-gradient(180deg,transparent,rgba(167,130,255,0.02),transparent);position:relative;overflow:hidden}
    .ld-chrome-inner{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
    .ld-chrome-head .ld-section-tag{text-align:left;margin-bottom:10px}
    .ld-chrome-head h2{font-size:clamp(28px,3.5vw,40px);font-weight:800;color:var(--text);letter-spacing:-1.4px;line-height:1.1;margin-bottom:14px}
    .ld-chrome-head h2 span{color:var(--purple)}
    .ld-chrome-head p{font-size:15px;color:var(--sub);line-height:1.7;margin-bottom:22px;max-width:480px}
    .ld-chrome-chips{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
    .ld-chrome-chip{display:flex;align-items:center;gap:10px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--text);letter-spacing:0.3px}
    .ld-chrome-chip .glyph{color:var(--green);width:16px;display:inline-block;text-align:center}
    .ld-chrome-cta{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;background:var(--purple);color:#ffffff;border:none;border-radius:6px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;font-weight:700;letter-spacing:1.2px;cursor:pointer;text-decoration:none;transition:transform 0.18s,box-shadow 0.15s}
    .ld-chrome-cta:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(167,130,255,0.45)}
    .ld-chrome-secondary{display:inline-flex;align-items:center;gap:8px;margin-left:10px;padding:13px 18px;background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:6px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;font-weight:700;letter-spacing:1.2px;cursor:pointer;text-decoration:none;transition:border-color 0.15s,color 0.15s}
    .ld-chrome-secondary:hover{border-color:var(--purple);color:var(--text)}

    /* Browser frame mock with popup overlay */
    .ld-chrome-stage{position:relative}
    .ld-browser{background:#1e1f23;border-radius:10px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.55);border:1px solid rgba(15,23,42,0.05)}
    .ld-browser-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2a2b30;border-bottom:1px solid rgba(15,23,42,0.05)}
    .ld-browser-dots{display:flex;gap:6px}
    .ld-browser-dots span{width:11px;height:11px;border-radius:50%}
    .ld-browser-url{flex:1;background:#1a1b1f;border-radius:5px;padding:6px 12px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:#a0a8b8;display:flex;align-items:center;gap:8px;letter-spacing:0.2px}
    .ld-browser-url .lock{color:#5db075}
    .ld-browser-tools{display:flex;gap:6px}
    .ld-browser-tools .tool{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:#1a1b1f;color:#7a8294;font-size:11px;cursor:default}
    .ld-browser-tools .tool.active{background:rgba(167,130,255,0.18);color:var(--purple);box-shadow:0 0 0 1px rgba(167,130,255,0.3)}
    .ld-browser-body{aspect-ratio:16/11;background:linear-gradient(135deg,#eaeaea,#cfd3da);position:relative;overflow:hidden}
    .ld-browser-listing{position:absolute;inset:0;display:flex;flex-direction:column}
    .ld-browser-listing-hero{flex:1.6;background:linear-gradient(135deg,#8395a8 0%,#5d6e82 50%,#3d4a5e 100%);display:flex;align-items:flex-end;padding:14px 16px;color:#fff;font-family:'Georgia',serif;font-style:italic;font-size:13px;letter-spacing:0.3px;opacity:0.85;position:relative}
    .ld-browser-listing-hero::after{content:"📷";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:42px;opacity:0.5}
    .ld-browser-listing-meta{flex:1;background:#f6f7f9;padding:14px 18px;color:#1a1a1a;display:flex;flex-direction:column;gap:6px}
    .ld-browser-listing-price{font-family:'Geist',sans-serif;font-size:22px;font-weight:800;color:#0a0a0a;letter-spacing:-0.6px}
    .ld-browser-listing-addr{font-family:'Geist',sans-serif;font-size:13px;color:#4a4a4a;font-weight:500}
    .ld-browser-listing-stats{display:flex;gap:14px;margin-top:4px;font-family:'Geist',sans-serif;font-size:12px;color:#666;font-weight:600}
    .ld-browser-listing-stats span strong{color:#1a1a1a}

    /* The RizeAI popup, floating top-right inside the browser frame */
    .ld-rd-popup{position:absolute;top:50px;right:14px;width:228px;background:var(--card);border:1px solid var(--border);border-radius: 6px;overflow:hidden;box-shadow:0 24px 56px rgba(0,0,0,0.55),0 0 0 1px rgba(167,130,255,0.12) inset;font-family:'Geist',sans-serif;color:var(--text);animation:popup-bob 4s ease-in-out infinite}
    @keyframes popup-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
    .ld-rd-popup-bar{display:flex;align-items:center;gap:6px;padding:8px 11px;background:rgba(15,23,42,0.025);border-bottom:1px solid var(--borderf)}
    .ld-rd-popup-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 2s infinite}
    .ld-rd-popup-title{font-family:'Geist Mono',ui-monospace,monospace;font-size:9px;font-weight:700;color:var(--blue);letter-spacing:1px}
    .ld-rd-popup-tag{margin-left:auto;font-family:'Geist Mono',ui-monospace,monospace;font-size:8px;font-weight:700;color:var(--green);letter-spacing:0.8px}
    .ld-rd-popup-body{padding:11px}
    .ld-rd-popup-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:8px;font-weight:700;color:var(--dim);letter-spacing:1.1px;margin-bottom:4px}
    .ld-rd-popup-addr{font-size:11.5px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:9px}
    .ld-rd-popup-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:9px}
    .ld-rd-popup-cell{background:rgba(15,23,42,0.025);border:1px solid var(--borderf);border-radius:3px;padding:6px 8px}
    .ld-rd-popup-cell.full{grid-column:1/-1}
    .ld-rd-popup-cell .lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:7px;font-weight:700;color:var(--dim);letter-spacing:0.8px;text-transform:uppercase}
    .ld-rd-popup-cell .val{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--text);margin-top:2px;letter-spacing:-0.3px}
    .ld-rd-popup-cell .val.green{color:var(--green)}
    .ld-rd-popup-cta{display:block;width:100%;text-align:center;padding:8px;background:var(--green);color:#ffffff;border:none;border-radius:4px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1px}

    /* Install instructions panel (toggles on CTA click) */
    .ld-chrome-install{margin-top:18px;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--purple);border-radius:6px;padding:18px 20px;display:none}
    .ld-chrome-install.open{display:block}
    .ld-chrome-install-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:var(--purple);letter-spacing:1.4px;margin-bottom:12px}
    .ld-chrome-install-step{display:flex;gap:12px;margin-bottom:10px;font-size:13px;color:var(--text);line-height:1.55}
    .ld-chrome-install-step .n{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:rgba(167,130,255,0.15);border:1px solid rgba(167,130,255,0.4);color:var(--purple);font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;flex-shrink:0}
    .ld-chrome-install-code{display:inline-block;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:3px;padding:2px 8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--blue)}

    /* ── CTA SECTION ── */
    /* ── X-RAY UNDERWRITING BAR — the "aha moment" terminal ── */
    .ld-xray{padding:64px 24px 80px;position:relative;background:linear-gradient(180deg,transparent 0%,rgba(0,28,61,0.45) 35%,rgba(0,28,61,0.45) 65%,transparent 100%);border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1)}
    .ld-xray-inner{max-width:920px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:12px}
    .ld-xray-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:var(--brass)}
    .ld-xray-title{font-size:clamp(30px,4vw,46px);font-weight:800;letter-spacing:-1.5px;color:var(--alabaster);text-align:center;line-height:1.08;margin:0}
    .ld-xray-title span{color:var(--brass);font-style:italic;font-weight:700}
    .ld-xray-sub{font-size:15px;color:var(--alabaster-2);text-align:center;max-width:580px;line-height:1.7;margin:0 0 28px}

    .ld-xray-card{width:100%;background:linear-gradient(180deg,rgba(0,12,31,0.85) 0%,rgba(10,17,40,0.92) 100%);border:1px solid rgba(212,175,55,0.32);border-radius:6px;overflow:hidden;box-shadow:0 36px 100px rgba(0,0,0,0.55),0 0 0 1px rgba(212,175,55,0.06) inset,0 0 60px rgba(33,85,205,0.12)}

    .ld-xray-bar{display:flex;align-items:center;gap:10px;padding:11px 18px;background:rgba(0,0,0,0.35);border-bottom:1px solid rgba(212,175,55,0.2);font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--alabaster-2)}
    .ld-xray-dot{width:8px;height:8px;border-radius:50%;background:var(--brass);box-shadow:0 0 12px var(--brass);animation:blink 1.6s infinite}
    .ld-xray-status{margin-left:auto;color:var(--brass)}

    .ld-xray-input-row{display:flex;align-items:stretch;gap:0;padding:18px;background:rgba(0,0,0,0.25);border-bottom:1px solid rgba(255,255,255,0.06);position:relative}
    .ld-xray-cursor{display:flex;align-items:center;padding:0 14px;color:var(--brass);font-family:'Geist Mono',ui-monospace,monospace;font-size:20px;font-weight:700;animation:blink 1.1s infinite}
    .ld-xray-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(33,85,205,0.45);border-radius:4px;padding:15px 18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:15px;color:var(--alabaster);outline:none;letter-spacing:0.2px;transition:all 0.2s;box-shadow:0 0 0 3px rgba(33,85,205,0.06)}
    .ld-xray-input:focus{border-color:var(--brass);box-shadow:0 0 0 3px rgba(212,175,55,0.15),0 0 20px rgba(212,175,55,0.15)}
    .ld-xray-input::placeholder{color:var(--alabaster-3)}
    .ld-xray-input:disabled{opacity:0.6}
    .ld-xray-go{margin-left:14px;background:var(--royal);color:#fff;border:1px solid var(--brass);border-radius:4px;padding:15px 26px;font-family:'Geist',sans-serif;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.5px;transition:all 0.2s;white-space:nowrap;text-transform:uppercase}
    .ld-xray-go:hover:not(:disabled){background:var(--royal-2);box-shadow:0 10px 30px rgba(212,175,55,0.32),0 0 20px rgba(212,175,55,0.2);transform:translateY(-1px)}
    .ld-xray-go:disabled{opacity:0.55;cursor:wait}

    .ld-xray-scan{padding:24px 20px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--alabaster-2);min-height:200px;display:flex;flex-direction:column;gap:8px}
    .ld-xray-scan-line{transition:opacity 0.2s;letter-spacing:0.4px}
    .ld-xray-scan-line:last-child{color:var(--brass)}

    .ld-xray-result{padding:24px;animation:xrayFade 0.6s ease}
    @keyframes xrayFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .ld-xray-result-addr{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;color:var(--brass);margin-bottom:18px;letter-spacing:0.6px;padding-bottom:14px;border-bottom:1px dashed rgba(212,175,55,0.22);display:flex;flex-wrap:wrap;align-items:baseline;gap:8px}
    .ld-xray-result-src{font-size:10px;color:var(--alabaster-3);letter-spacing:1.2px;text-transform:uppercase}
    .ld-xray-cell-fine{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;color:var(--alabaster-3);margin-top:4px;letter-spacing:0.6px;line-height:1.4}

    /* Error / inconclusive state */
    .ld-xray-error{display:flex;align-items:flex-start;gap:14px;padding:22px 24px;background:rgba(242,92,92,0.06);border:1px solid rgba(242,92,92,0.25);border-left:3px solid var(--red);margin:18px;border-radius:4px;animation:xrayFade 0.4s ease}
    .ld-xray-error-icon{color:var(--red);font-size:16px;margin-top:2px}
    .ld-xray-error-title{font-family:'Geist',sans-serif;font-size:14px;font-weight:800;color:var(--alabaster);letter-spacing:0.3px;margin-bottom:5px}
    .ld-xray-error-sub{font-family:'Geist',sans-serif;font-size:13px;color:var(--alabaster-2);line-height:1.55}
    .ld-xray-error-eg{background:none;border:none;color:var(--brass);font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:600;cursor:pointer;padding:0;letter-spacing:0.1px;text-decoration:underline;text-decoration-color:rgba(212,175,55,0.4);text-underline-offset:3px}
    .ld-xray-error-eg:hover{color:var(--alabaster);text-decoration-color:var(--brass)}

    .ld-xray-section-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--alabaster-3);text-transform:uppercase;margin:0 0 10px}
    .ld-xray-section-lbl.restricted{color:var(--brass);margin-top:20px;display:flex;align-items:center;gap:6px}

    .ld-xray-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:6px}
    .ld-xray-cell{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:14px 16px}
    .ld-xray-cell-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;color:var(--alabaster-3);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px}
    .ld-xray-cell-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:18px;font-weight:700;color:var(--alabaster);letter-spacing:-0.3px}
    .ld-xray-cell.premium{border-color:rgba(212,175,55,0.3);border-left:2px solid var(--brass);background:linear-gradient(180deg,rgba(212,175,55,0.04) 0%,rgba(0,0,0,0.25) 100%)}
    .ld-xray-cell.premium .ld-xray-cell-val{color:var(--brass);filter:blur(5px);user-select:none}

    .xray-blurred{position:relative}

    .ld-xray-cta{display:block;width:100%;background:linear-gradient(135deg,var(--royal-2),var(--royal));color:#fff;border:1px solid var(--brass);border-radius:4px;padding:16px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.6px;transition:all 0.25s;text-transform:uppercase;margin-top:14px;position:relative;overflow:hidden}
    .ld-xray-cta::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.25),transparent);transition:left 0.6s}
    .ld-xray-cta:hover{transform:translateY(-1px);box-shadow:0 14px 36px rgba(212,175,55,0.35),0 0 0 1px var(--brass)}
    .ld-xray-cta:hover::after{left:150%}
    .ld-xray-foot{text-align:center;font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;color:var(--alabaster-3);margin-top:12px;letter-spacing:1.4px;text-transform:uppercase}

    @media(max-width:720px){
      .ld-xray-input-row{flex-direction:column;gap:10px;padding:14px}
      .ld-xray-cursor{display:none}
      .ld-xray-go{margin-left:0}
      .ld-xray-grid{grid-template-columns:1fr}
    }

    /* ── BEFORE/AFTER DEAL TRANSLATOR — interactive slider ── */
    .ld-translator{padding:90px 24px;position:relative;background:linear-gradient(180deg,transparent,rgba(0,28,61,0.4) 50%,transparent)}
    .ld-translator-inner{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;align-items:center}
    .ld-translator-head{text-align:center;max-width:720px;margin-bottom:40px}
    .ld-translator-head .ld-section-tag{color:var(--brass)}
    .ld-translator-title{font-size:clamp(30px,4vw,48px);font-weight:800;letter-spacing:-1.6px;color:var(--alabaster);line-height:1.08;margin:0 0 14px}
    .ld-translator-title span{color:var(--brass);font-style:italic;font-weight:700}
    .ld-translator-sub{font-size:16px;color:var(--alabaster-2);line-height:1.7;margin:0}

    .ld-trans-stage{width:100%;position:relative;display:grid;grid-template-columns:1fr 1fr;gap:0;background:rgba(0,0,0,0.3);border:1px solid rgba(212,175,55,0.25);border-radius:6px;overflow:hidden;box-shadow:0 36px 100px rgba(0,0,0,0.45);min-height:520px}

    .ld-trans-side{padding:32px 28px;position:relative;display:flex;flex-direction:column;gap:14px}
    .ld-trans-side-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase}
    .ld-trans-before{background:rgba(15,23,42,0.4)}
    .ld-trans-before .ld-trans-side-tag{color:var(--alabaster-3)}
    .ld-trans-after{background:linear-gradient(180deg,rgba(33,85,205,0.12) 0%,rgba(212,175,55,0.06) 100%);border-left:1px solid rgba(212,175,55,0.2)}
    .ld-trans-after .ld-trans-side-tag{color:var(--brass)}

    /* The OM messy pane */
    .ld-trans-om{flex:1;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:18px;display:flex;flex-direction:column;gap:6px;overflow:hidden;position:relative}
    .ld-trans-om::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0,transparent 19px,rgba(255,255,255,0.015) 19px,rgba(255,255,255,0.015) 20px);pointer-events:none}
    .ld-trans-om-title{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;color:var(--alabaster-3);letter-spacing:1.2px}
    .ld-trans-om-sub{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);margin-bottom:8px}
    .ld-trans-om-noise{display:flex;flex-direction:column;gap:5px}
    .ld-trans-line{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);line-height:1.5;letter-spacing:0.1px;opacity:0.7}
    .ld-trans-line.w1{color:rgba(240,240,240,0.55)}
    .ld-trans-line.w2{color:rgba(240,240,240,0.45)}
    .ld-trans-line.w3{color:rgba(240,240,240,0.35)}

    /* The clean Rize dashboard pane */
    .ld-trans-dash{flex:1;background:linear-gradient(180deg,rgba(0,12,31,0.85) 0%,rgba(10,17,40,0.92) 100%);border:1px solid rgba(212,175,55,0.3);border-left:3px solid var(--brass);border-radius:4px;padding:20px;display:flex;flex-direction:column;gap:12px}
    .ld-trans-dash-head{display:flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;color:var(--brass);letter-spacing:1.4px;text-transform:uppercase;margin-bottom:6px;padding-bottom:10px;border-bottom:1px dashed rgba(212,175,55,0.2)}
    .ld-trans-dash-dot{width:7px;height:7px;border-radius:50%;background:var(--brass);box-shadow:0 0 10px var(--brass);animation:blink 1.6s infinite}
    .ld-trans-dash-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
    .ld-trans-dash-row.hl{padding:14px 14px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:4px;margin:4px 0}
    .ld-trans-dash-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;color:var(--alabaster-2);letter-spacing:0.4px}
    .ld-trans-dash-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:18px;font-weight:800;color:var(--alabaster);letter-spacing:-0.4px}
    .ld-trans-dash-row.hl .ld-trans-dash-val{color:var(--brass);font-size:22px}
    .ld-trans-dash-verdict{display:flex;align-items:flex-start;gap:14px;margin-top:10px;padding:16px;background:rgba(45,212,127,0.07);border:1px solid rgba(45,212,127,0.28);border-radius:4px}
    .ld-trans-dash-grade{font-size:34px;font-weight:800;color:var(--green);line-height:1;font-family:'Geist',sans-serif;width:54px;height:54px;border:2px solid var(--green);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:-1.5px}
    .ld-trans-dash-verdict-lbl{font-family:'Geist',sans-serif;font-size:14px;font-weight:800;color:var(--alabaster);letter-spacing:0.4px;margin-bottom:4px}
    .ld-trans-dash-verdict-sub{font-family:'Geist',sans-serif;font-size:12px;color:var(--alabaster-2);line-height:1.55}

    /* Slider clip overlay — covers the AFTER pane until dragged */
    .ld-trans-clip{position:absolute;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:none;transition:clip-path 0.05s linear}

    /* Drag handle */
    .ld-trans-handle{position:absolute;top:0;bottom:0;width:3px;transform:translateX(-50%);pointer-events:none;z-index:5}
    .ld-trans-handle-bar{position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,var(--brass) 8%,var(--brass) 92%,transparent 100%);box-shadow:0 0 18px rgba(212,175,55,0.7)}
    .ld-trans-handle-grip{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:50%;background:var(--royal);border:2px solid var(--brass);color:var(--alabaster);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 24px rgba(212,175,55,0.4)}

    .ld-trans-range{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;z-index:6;margin:0;padding:0;background:none;border:none}

    .ld-translator-foot{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:880px;margin-top:18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);letter-spacing:1.4px;text-transform:uppercase}
    .ld-translator-foot-mid{color:var(--brass);font-weight:700}

    @media(max-width:780px){
      .ld-trans-stage{grid-template-columns:1fr;min-height:auto}
      .ld-trans-side{padding:20px}
      .ld-trans-clip,.ld-trans-handle,.ld-trans-range{display:none}
    }

    /* ── UNSEEN MARKET PULSE — map + ticker ── */
    .ld-pulse{padding:90px 24px;position:relative;background:linear-gradient(180deg,transparent,rgba(0,12,31,0.5) 50%,transparent);border-top:1px solid rgba(212,175,55,0.08)}
    .ld-pulse-inner{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;align-items:center}
    .ld-pulse-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass)}
    .ld-pulse-tag::before{content:''}
    .ld-pulse-title{font-size:clamp(30px,4vw,46px);font-weight:800;letter-spacing:-1.5px;color:var(--alabaster);text-align:center;line-height:1.08;margin:14px 0 12px}
    .ld-pulse-title span{color:var(--brass);font-style:italic;font-weight:700}
    .ld-pulse-sub{font-size:15px;color:var(--alabaster-2);text-align:center;max-width:620px;line-height:1.7;margin:0 0 40px}

    .ld-pulse-stage{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;width:100%;align-items:stretch}
    .ld-pulse-map{position:relative;background:linear-gradient(180deg,rgba(0,12,31,0.8),rgba(10,17,40,0.92));border:1px solid rgba(212,175,55,0.22);border-radius:6px;overflow:hidden;min-height:420px;display:flex;align-items:center;justify-content:center}
    .ld-pulse-svg{width:100%;height:100%;max-height:460px}

    .ld-pulse-gate{position:absolute;bottom:18px;left:18px;right:18px;background:rgba(0,12,31,0.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--brass);border-radius:4px;padding:14px 18px;color:var(--alabaster);font-family:'Geist',sans-serif;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:3px;transition:all 0.2s}
    .ld-pulse-gate:hover{background:rgba(33,85,205,0.4);box-shadow:0 8px 28px rgba(212,175,55,0.2),0 0 0 1px var(--brass)}
    .ld-pulse-gate-icon{position:absolute;top:14px;right:18px;color:var(--brass);font-size:14px}
    .ld-pulse-gate-title{font-size:13px;font-weight:800;color:var(--brass);letter-spacing:0.4px}
    .ld-pulse-gate-sub{font-size:11.5px;color:var(--alabaster-2);letter-spacing:0.1px}

    .ld-pulse-rail{display:flex;flex-direction:column;gap:14px}
    .ld-pulse-counter{background:linear-gradient(180deg,rgba(212,175,55,0.1),rgba(33,85,205,0.08));border:1px solid rgba(212,175,55,0.3);border-radius:6px;padding:24px 22px;text-align:center}
    .ld-pulse-counter-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:48px;font-weight:800;color:var(--brass);letter-spacing:-2px;line-height:1;margin-bottom:8px;text-shadow:0 4px 24px rgba(212,175,55,0.3)}
    .ld-pulse-counter-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-2);letter-spacing:1.2px;text-transform:uppercase;line-height:1.55}

    .ld-pulse-ticker{flex:1;background:rgba(0,12,31,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;display:flex;flex-direction:column}
    .ld-pulse-ticker-head{padding:11px 14px;background:rgba(33,85,205,0.18);border-bottom:1px solid rgba(212,175,55,0.18);font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;color:var(--brass);letter-spacing:1.4px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
    .ld-pulse-ticker-dot{width:7px;height:7px;border-radius:50%;background:var(--brass);box-shadow:0 0 10px var(--brass);animation:blink 1.6s infinite}
    .ld-pulse-ticker-rows{flex:1;display:flex;flex-direction:column}
    .ld-pulse-ticker-row{display:flex;gap:12px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center}
    .ld-pulse-ticker-row:last-child{border-bottom:none}
    .ld-pulse-ticker-time{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);min-width:44px}
    .ld-pulse-ticker-msg{font-family:'Geist',sans-serif;font-size:12.5px;color:var(--alabaster-2);line-height:1.4}
    .ld-pulse-ticker-msg strong{color:var(--brass);font-weight:700}

    .ld-pulse-cta{background:linear-gradient(135deg,var(--royal-2),var(--royal));color:#fff;border:1px solid var(--brass);border-radius:4px;padding:14px;font-family:'Geist',sans-serif;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.6px;transition:all 0.2s;text-transform:uppercase}
    .ld-pulse-cta:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(212,175,55,0.3),0 0 0 1px var(--brass)}

    @media(max-width:880px){
      .ld-pulse-stage{grid-template-columns:1fr}
      .ld-pulse-map{min-height:340px}
    }

    /* ── (legacy) SEE THE UNSEEN MARKET — interactive terminal ── */
    .ld-unseen{padding:90px 24px 60px;position:relative;background:linear-gradient(180deg,transparent 0%,rgba(0,28,61,0.5) 50%,transparent 100%);border-top:1px solid rgba(212,175,55,0.08);border-bottom:1px solid rgba(212,175,55,0.08)}
    .ld-unseen-inner{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:14px}
    .ld-unseen-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass)}
    .ld-unseen-title{font-size:clamp(34px,4.5vw,54px);font-weight:800;letter-spacing:-1.8px;color:var(--alabaster);text-align:center;line-height:1.05;margin:0}
    .ld-unseen-title span{color:var(--brass);font-style:italic;font-weight:700}
    .ld-unseen-sub{font-size:16px;color:var(--alabaster-2);text-align:center;max-width:620px;line-height:1.7;margin:0 0 36px}

    .ld-unseen-terminal{width:100%;max-width:920px;background:linear-gradient(180deg,rgba(0,28,61,0.7) 0%,rgba(10,17,40,0.85) 100%);border:1px solid rgba(212,175,55,0.25);border-radius:6px;overflow:hidden;box-shadow:0 32px 90px rgba(0,0,0,0.5),0 0 0 1px rgba(33,85,205,0.08) inset}

    .ld-unseen-bar{display:flex;align-items:center;gap:10px;padding:11px 18px;background:rgba(0,0,0,0.35);border-bottom:1px solid rgba(212,175,55,0.18);font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--alabaster-2)}
    .ld-unseen-dot{width:8px;height:8px;border-radius:50%;background:var(--brass);box-shadow:0 0 10px var(--brass);animation:blink 2s infinite}
    .ld-unseen-status{margin-left:auto;color:var(--brass)}

    .ld-unseen-input-row{display:flex;align-items:stretch;gap:0;padding:14px;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06)}
    .ld-unseen-prompt{display:flex;align-items:center;padding:0 14px;color:var(--brass);font-family:'Geist Mono',ui-monospace,monospace;font-size:18px;font-weight:700}
    .ld-unseen-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.18);border-radius:4px;padding:14px 16px;font-family:'Geist Mono',ui-monospace,monospace;font-size:15px;color:var(--alabaster);outline:none;letter-spacing:0.2px;transition:border-color 0.2s}
    .ld-unseen-input:focus{border-color:var(--brass);box-shadow:0 0 0 3px rgba(212,175,55,0.12)}
    .ld-unseen-input::placeholder{color:var(--alabaster-3)}
    .ld-unseen-go{margin-left:12px;background:var(--royal);color:#fff;border:1px solid var(--brass);border-radius:4px;padding:14px 22px;font-family:'Geist',sans-serif;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.4px;transition:all 0.2s;white-space:nowrap;text-transform:uppercase}
    .ld-unseen-go:hover{background:var(--royal-2);box-shadow:0 8px 24px rgba(212,175,55,0.3);transform:translateY(-1px)}

    .ld-unseen-result{padding:24px;transition:opacity 0.6s ease}
    .ld-unseen-result-head{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.2px;color:var(--brass);margin-bottom:16px;text-transform:uppercase}
    .ld-unseen-result-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
    .ld-unseen-metric{background:rgba(0,0,0,0.3);border:1px solid rgba(212,175,55,0.15);border-left:2px solid var(--brass);border-radius:4px;padding:14px 16px}
    .ld-unseen-metric-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:24px;font-weight:800;color:var(--brass);letter-spacing:-0.5px;line-height:1;margin-bottom:6px}
    .ld-unseen-metric-lbl{font-size:11px;color:var(--alabaster-2);line-height:1.4}

    .ld-unseen-blur{display:flex;flex-direction:column;gap:0;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:6px 0;margin-bottom:14px}
    .ld-unseen-row{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;color:var(--alabaster-2);border-bottom:1px solid rgba(255,255,255,0.03)}
    .ld-unseen-row:last-child{border-bottom:none}
    .ld-unseen-row:nth-child(n+4){filter:blur(4px);user-select:none;pointer-events:none}

    .ld-unseen-cta{display:block;width:100%;background:linear-gradient(135deg,var(--royal-2),var(--royal));color:#fff;border:1px solid var(--brass);border-radius:4px;padding:16px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.6px;transition:all 0.2s;text-transform:uppercase;margin-top:4px}
    .ld-unseen-cta:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(212,175,55,0.3),0 0 0 1px var(--brass)}

    @media(max-width:720px){
      .ld-unseen-input-row{flex-direction:column;gap:10px}
      .ld-unseen-go{margin-left:0}
      .ld-unseen-result-grid{grid-template-columns:repeat(2,1fr)}
    }

    /* ── FAMILY OFFICE FOOTER — minimalist, manifesto, By Invitation Only ── */
    .ld-foot{background:#000c1f;border-top:1px solid rgba(212,175,55,0.18);padding:64px 24px 40px;position:relative}
    .ld-foot::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,var(--brass) 50%,transparent 100%);opacity:0.4}
    .ld-foot-inner{max-width:880px;margin:0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
    .ld-foot-logo{font-size:22px;font-weight:800;letter-spacing:-0.4px;color:var(--brass);font-family:'Geist',sans-serif}
    .ld-foot-logo span{color:var(--alabaster)}
    .ld-foot-manifesto{font-size:14px;color:var(--alabaster-2);max-width:540px;line-height:1.75;font-style:italic;font-family:'Geist',sans-serif}
    .ld-foot-rule{width:54px;height:1px;background:var(--brass);opacity:0.6;margin:6px 0}
    .ld-foot-links{display:flex;align-items:center;gap:32px;flex-wrap:wrap;justify-content:center}
    .ld-foot-links span{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--alabaster-3);cursor:pointer;letter-spacing:1.4px;text-transform:uppercase;transition:color 0.2s}
    .ld-foot-links span:hover{color:var(--brass)}
    .ld-foot-note{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);letter-spacing:1.2px;margin-top:8px;text-transform:uppercase}

    .ld-cta{text-align:center;padding:90px 24px;border-top:1px solid var(--borderf);position:relative;overflow:hidden}
    .ld-cta::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.07) 0%,transparent 60%);pointer-events:none}
    .ld-cta h2{font-size:clamp(28px,4vw,48px);font-weight:800;letter-spacing:-1.5px;color:var(--text);margin-bottom:14px;position:relative;z-index:1;line-height:1.1}
    .ld-cta h2 span{color:var(--blue)}
    .ld-cta p{font-size:16px;color:var(--sub);margin-bottom:32px;position:relative;z-index:1}
    .ld-cta-btn{background:var(--blue);color:#fff;border:none;border-radius:10px;padding:16px 40px;font-family:'Geist',sans-serif;font-size:17px;font-weight:700;cursor:pointer;transition:all 0.15s;position:relative;z-index:1}
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
      .ld-anatomy-step{grid-template-columns:1fr;gap:14px}
      .ld-pro-grid{grid-template-columns:1fr;gap:16px}
      .ld-an-metric-grid{grid-template-columns:repeat(2,1fr)}
      .ld-chrome-inner{grid-template-columns:1fr;gap:32px}
      .ld-rd-popup{width:200px;top:42px;right:8px}
      .ld-toolkit-cat-sub{display:none}
      .ld-toolkit-grid{grid-template-columns:1fr}
    }
    @media(max-width:600px){
      .ld-h1{letter-spacing:-1.5px}
      .ld-section{padding:60px 16px}
      .ld-stats{gap:20px}
    }
    @media(max-width:480px){
      .ld-an-metric-grid{grid-template-columns:1fr;gap:8px}
      .ld-toolkit-grid{grid-template-columns:1fr}
      .ld-anatomy{padding:60px 14px}
      .ld-pro{padding:48px 14px 60px}
      .ld-chrome{padding:48px 14px 60px}
      .ld-toolkit{padding:60px 14px 48px}
      .ld-anatomy-step{gap:12px}
      .ld-anatomy-deal-bar{font-size:10px;padding:7px 12px}
      .ld-anatomy-deal-bar span:last-child{word-break:break-word}
      .ld-rd-popup{width:170px;top:36px;right:6px}
      .ld-pro-doc-watermark{display:none}
      .ld-anatomy-title{font-size:20px}
      .ld-anatomy-desc{font-size:13px}
    }
    input,select{font-size:16px!important}
  `;

  return (
    <div className="ld-page">
      <style>{css}</style>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght;500;600;700;800&family=Geist+Mono:wght;500;600;700&display=swap" rel="stylesheet" />

      <TopNav />

      {/* ── HERO ── */}
      <section className="ld-hero">
        {/* Full-bleed background video — autoplay loop muted; falls back
            to the dark slate background if the browser blocks autoplay. */}
        <video
          className="ld-hero-bgvid"
          src="/hero-demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster=""
        >
          Your browser doesn&rsquo;t support inline video.
        </video>
        <div className="ld-hero-bgvid-overlay" />
        <div className="ld-hero-bgvid-tint" />
        <div className="ld-glow" />
        <div className="ld-hero-inner">
          <div className="ld-hero-head">
            <div className="ld-eyebrow">
              <div className="ld-eyebrow-dot" />
              THE HIDDEN DOOR · BY INVITATION · NORTH AMERICA
            </div>
            <h1 className="ld-h1">Underwrite like an insider.<br /><span>Operate with absolute certainty.</span></h1>
            <p className="ld-hero-p">RizeAI gives you the exact AI infrastructure used to source, analyze, and close multi-million dollar off-market deals across North America — with <strong style={{color:"var(--brass)"}}>institutional precision</strong>, in under 60 seconds.</p>
          </div>

          <div className="ld-hero-foot">
            {/* Live activity strip */}
            <div className="ld-activity">
              <div className="ld-activity-head">
                <span className="ld-activity-glyph">▸</span>
                LIVE FEED <span style={{color:"var(--dim)"}}>· Last 24h</span>
              </div>
              <div className="ld-activity-rows">
                <div className="ld-activity-row"><span className="ld-ar-time">14:32</span><span className="ld-ar-addr">2424 Westmount Rd NW · Calgary</span><span className="ld-ar-tag go">[ GO ]</span><span className="ld-ar-roi pos">+18.3%</span></div>
                <div className="ld-activity-row"><span className="ld-ar-time">14:28</span><span className="ld-ar-addr">903 Elm St · Vancouver</span><span className="ld-ar-tag no">[ PASS ]</span><span className="ld-ar-roi neg">−2.8%</span></div>
                <div className="ld-activity-row"><span className="ld-ar-time">14:21</span><span className="ld-ar-addr">17 Sunrise Blvd · Toronto</span><span className="ld-ar-tag go">[ GO ]</span><span className="ld-ar-roi pos">+14.2%</span></div>
              </div>
            </div>

            <div className="ld-hero-trust">
              {[
                {icon:"●", text:"Free · no credit card", clr:"var(--green)"},
                {icon:"●", text:"Flip · BRRRR · Multifamily", clr:"var(--blue)"},
                {icon:"●", text:"US &amp; Canada markets", clr:"var(--amber)"},
              ].map(t => (
                <div key={t.text} className="ld-trust-pill">
                  <span style={{color:t.clr,fontSize:8}} dangerouslySetInnerHTML={{__html:t.icon}}/> <span dangerouslySetInnerHTML={{__html:t.text}}/>
                </div>
              ))}
            </div>

            <div className="ld-stats">
              <div><div className="ld-stat-val" id="cDeals">0</div><div className="ld-stat-lbl">Deals analyzed</div></div>
              <div><div className="ld-stat-val" id="cProfit">$0</div><div className="ld-stat-lbl">Avg net profit</div></div>
              <div><div className="ld-stat-val" id="cROI">0%</div><div className="ld-stat-lbl">Avg ROI</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── X-RAY UNDERWRITING BAR — the "aha moment" within 10 seconds ──
          Type any AB/BC multifamily address → fast loading sequence flashes →
          three free data points reveal + two Rize Proprietary Insights blurred
          behind the auth CTA. Designed to feel like temporary access to a
          classified institutional terminal. */}
      <section className="ld-xray fade">
        <div className="ld-xray-inner">
          <div className="ld-xray-tag">// CLASSIFIED INTELLIGENCE TERMINAL · 90-SEC GUEST PASS</div>
          <h2 className="ld-xray-title">Test the system. <span>X-ray any address.</span></h2>
          <p className="ld-xray-sub">
            Type an AB or BC multifamily address. In 90 seconds you'll see what the
            institutional desks see — and exactly which two numbers we keep gated.
          </p>

          <div className="ld-xray-card">
            <div className="ld-xray-bar">
              <span className="ld-xray-dot" />
              <span>X-RAY UNDERWRITING · LIVE</span>
              <span className="ld-xray-status">
                {xrayState === "idle" && "▸ READY"}
                {xrayState === "scanning" && "▸ SCANNING…"}
                {xrayState === "revealed" && `▸ COMPLETE · ${(xrayData?.scanMs / 1000).toFixed(2)}s`}
                {xrayState === "error" && "▸ SCAN FAILED"}
              </span>
            </div>

            <div className="ld-xray-input-row">
              <span className="ld-xray-cursor">▸</span>
              <input
                type="text"
                className="ld-xray-input"
                placeholder="Enter an AB / BC multifamily address"
                value={xrayAddress}
                onChange={(e) => setXrayAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runXray(); }}
                disabled={xrayState === "scanning"}
              />
              <button
                className="ld-xray-go"
                onClick={runXray}
                disabled={xrayState === "scanning"}
              >
                {xrayState === "scanning" ? "Scanning…" : "Run X-Ray"}
              </button>
            </div>

            {xrayState === "scanning" && (
              <div className="ld-xray-scan">
                {XRAY_PHASES.slice(0, xrayPhase + 1).map((p, i) => (
                  <div
                    key={i}
                    className="ld-xray-scan-line"
                    style={{ opacity: i === xrayPhase ? 1 : 0.45 }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}

            {xrayState === "error" && (
              <div className="ld-xray-error">
                <div className="ld-xray-error-icon">▲</div>
                <div className="ld-xray-error-body">
                  <div className="ld-xray-error-title">Scan inconclusive</div>
                  <div className="ld-xray-error-sub">
                    {xrayError}{" "}
                    Try a full Canadian address — e.g.{" "}
                    <button
                      type="button"
                      className="ld-xray-error-eg"
                      onClick={() => {
                        setXrayAddress("2424 Westmount Rd NW, Calgary AB");
                        setXrayState("idle");
                        setXrayError("");
                      }}
                    >2424 Westmount Rd NW, Calgary AB</button>.
                  </div>
                </div>
              </div>
            )}

            {xrayState === "revealed" && xrayData && (
              <div className="ld-xray-result">
                <div className="ld-xray-result-addr">
                  ▸ {xrayDisplayAddress}
                  {xrayData.source && (
                    <span className="ld-xray-result-src"> · src: {xrayData.source}</span>
                  )}
                </div>

                <div className="ld-xray-section-lbl">Public record</div>
                <div className="ld-xray-grid">
                  <div className="ld-xray-cell">
                    <div className="ld-xray-cell-lbl">Year built</div>
                    <div className="ld-xray-cell-val">
                      {xrayData.yearBuilt ? xrayData.yearBuilt : "—"}
                    </div>
                  </div>
                  <div className="ld-xray-cell">
                    <div className="ld-xray-cell-lbl">Assessed value</div>
                    <div className="ld-xray-cell-val">{fmtUSD(xrayData.assessedValue)}</div>
                  </div>
                  <div className="ld-xray-cell">
                    <div className="ld-xray-cell-lbl">Zoning</div>
                    <div className="ld-xray-cell-val">
                      {xrayData.zoningCode || "—"}
                    </div>
                    {xrayData.zoningDesc && (
                      <div className="ld-xray-cell-fine">{xrayData.zoningDesc}</div>
                    )}
                  </div>
                </div>

                <div className="ld-xray-section-lbl restricted">▲ Rize Proprietary Insights · GATED</div>
                <div className="ld-xray-grid xray-blurred">
                  <div className="ld-xray-cell premium">
                    <div className="ld-xray-cell-lbl">AI forward NOI · true cap</div>
                    <div className="ld-xray-cell-val">$███,███ · █.█%</div>
                  </div>
                  <div className="ld-xray-cell premium">
                    <div className="ld-xray-cell-lbl">Max Allowable Offer (MAO)</div>
                    <div className="ld-xray-cell-val">$█.██M</div>
                  </div>
                  <div className="ld-xray-cell premium">
                    <div className="ld-xray-cell-lbl">AI buy verdict · conviction</div>
                    <div className="ld-xray-cell-val">██ · ██%</div>
                  </div>
                </div>

                <button className="ld-xray-cta" onClick={scrollToAuth}>
                  Unlock the true cap rate, MAO &amp; AI buy verdict →
                </button>
                <div className="ld-xray-foot">Free during launch · No credit card · By invitation</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FULL TOOLKIT — 20 tools across 5 categories ── */}
      <div className="ld-toolkit fade">
        <div className="ld-toolkit-inner">
          <div className="ld-toolkit-head">
            <div className="ld-section-tag">Your full toolkit</div>
            <h2 className="ld-section-title">20 tools.<br /><span>One platform.</span></h2>
            <p className="ld-section-sub">Every tool you need — from sourcing through closing through portfolio tracking. All free right now.</p>
          </div>

          {[
            {
              cat: "ANALYZE",
              color: "var(--green)",
              sub: "Run the math on a specific deal",
              tools: [
                { icon: "🏚️", name: "Fix & Flip Analyzer",    desc: "ARV, rehab, MAO, deal score, PDF + offer letter.",            route: "/app" },
                { icon: "🔄", name: "BRRRR Calculator",       desc: "Cash recycled, DSCR, refi modeling, 5-year cash flow.",       route: "/brrrr" },
                { icon: "🏢", name: "Multifamily Underwriter", desc: "Cap rate, NOI, IRR, equity multiple, sensitivity grids.",    route: "/commercial" },
                { icon: "⚡", name: "Deal Comparison",        desc: "Two deals head-to-head. Live winner scoring on every metric.", route: "/compare" },
                { icon: "💰", name: "Loan Compare",           desc: "Three mortgages side-by-side. Best CF, lowest total cost.",   route: "/loans" },
                { icon: "📊", name: "Mortgage Qualifier",     desc: "OSFI B-20 stress test. Will the bank actually approve you?",  route: "/qualify" },
              ],
            },
            {
              cat: "SOURCE",
              color: "var(--blue)",
              sub: "Find and screen deals before you commit",
              tools: [
                { icon: "🛰️", name: "Property Intelligence", desc: "Live zoning, permits, AI thesis. Any US or Canadian address.", route: "/property" },
                { icon: "💎", name: "Property Worth",        desc: "AVM valuation with low / mid / high range.",                  route: "/worth" },
                { icon: "🔎", name: "Deal Screener",         desc: "Bulk evaluate dozens of properties. Filter by margin / MAO.",  route: "/screen" },
                { icon: "🚨", name: "Distress Checker",      desc: "Detect distressed-property signals (price drops, DOM, tax).",  route: "/distress" },
                { icon: "📡", name: "Market Triggers",       desc: "Surface terminated, withdrawn & suspended listings by area.",   route: "/triggers" },
              ],
            },
            {
              cat: "TRACK",
              color: "var(--purple)",
              sub: "Manage your deals and your net worth",
              tools: [
                { icon: "📋", name: "Dashboard",       desc: "Every analyzed deal. Filter, search, CSV export.",            route: "/dashboard" },
                { icon: "📈", name: "Pipeline",        desc: "Deal flow from sourcing → offer → closing.",                  route: "/pipeline" },
                { icon: "🏘️", name: "Portfolio",       desc: "Closed deals + profit charts + holdings over time.",          route: "/portfolio" },
                { icon: "💼", name: "Net Worth",       desc: "Project your 5-year net worth across the portfolio.",        route: "/networth" },
                { icon: "📐", name: "Budget Tracker",  desc: "Track active rehab budgets — actual vs. planned.",            route: "/budget" },
                { icon: "🔔", name: "Deal Alerts",     desc: "Get notified when matching properties hit the market.",       route: "/alerts" },
              ],
            },
            {
              cat: "SPECIALIST",
              color: "var(--amber)",
              sub: "Deeper calcs for specific questions",
              tools: [
                { icon: "🛠️", name: "Rehab Calculator", desc: "Per-room cost breakdown with regional unit prices.",         route: "/rehab" },
                { icon: "📑", name: "Tax Strategy",     desc: "Depreciation, CCA, capital gains, 1031 / s.85 angles.",      route: "/tax" },
              ],
            },
            {
              cat: "LEARN",
              color: "var(--red)",
              sub: "Sharpen your underwriting reflexes",
              tools: [
                { icon: "📚", name: "Education Hub",   desc: "Plain-English guides on flip, BRRRR, multifamily.",           route: "/learn" },
                { icon: "🎯", name: "Quiz",            desc: "Test your deal-eval reflexes. Snap verdicts on real deals.",  route: "/quiz" },
              ],
            },
          ].map(category => (
            <div key={category.cat} className="ld-toolkit-cat">
              <div className="ld-toolkit-cat-head">
                <span className="ld-toolkit-cat-tag" style={{ color: category.color }}>▸ {category.cat}</span>
                <span className="ld-toolkit-cat-count">· {category.tools.length} tools</span>
                <span className="ld-toolkit-cat-sub">{category.sub}</span>
              </div>
              <div className="ld-toolkit-grid">
                {category.tools.map(t => (
                  <div
                    key={t.name}
                    className="ld-toolkit-card"
                    style={{ borderLeft: `3px solid ${category.color}` }}
                    onClick={() => navigate(t.route)}
                  >
                    <div className="ld-toolkit-card-row">
                      <span className="ld-toolkit-card-icon">{t.icon}</span>
                      <span className="ld-toolkit-card-name">{t.name}</span>
                      <span className="ld-toolkit-card-arrow" style={{ color: category.color }}>→</span>
                    </div>
                    <div className="ld-toolkit-card-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ANATOMY OF A DEAL — one real address, end-to-end ── */}
      <section className="ld-anatomy fade">
        <div className="ld-anatomy-inner">
          <div className="ld-anatomy-head">
            <div className="ld-section-tag">Anatomy of a deal</div>
            <h2 className="ld-section-title">See exactly what comes out.<br /><span>One real deal. End to end.</span></h2>
            <p className="ld-section-sub">A live Calgary triplex opportunity, run through the platform. Same flow on any of your deals.</p>
            <div className="ld-anatomy-deal-bar">
              <span style={{color:"var(--green)"}}>●</span>
              <span>2424 WESTMOUNT RD NW · CALGARY, AB · R-CG · $720K LIST</span>
            </div>
          </div>

          <div className="ld-anatomy-steps">

            {/* STEP 1 — Search */}
            <div className="ld-anatomy-step">
              <div className="ld-anatomy-left">
                <div className="ld-anatomy-num">▸ STEP 01</div>
                <div className="ld-anatomy-title">Drop the address in.</div>
                <div className="ld-anatomy-desc">Type any US or Canadian address. We geocode it, hit live city open-data APIs, pull CMHC rental survey + active permits — automatically.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>SEARCH · LIVE FETCH</span>
                  <span className="ld-an-bar-tag">▸ 6S</span>
                </div>
                <div className="ld-an-body">
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:14,color:"var(--text)"}}>
                    <span style={{color:"var(--green)",marginRight:8}}>▸</span>
                    analyze <span style={{color:"var(--amber)"}}>"2424 Westmount Rd NW, Calgary, AB"</span>
                  </div>
                  <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:7,fontFamily:"'Geist Mono',monospace",fontSize:12.5}}>
                    <div style={{color:"var(--sub)"}}><span style={{color:"var(--green)",marginRight:8}}>✓</span><span style={{color:"var(--text)"}}>geocoded</span> <span style={{color:"var(--dim)"}}>· 51.0594°N 114.1014°W</span></div>
                    <div style={{color:"var(--sub)"}}><span style={{color:"var(--green)",marginRight:8}}>✓</span><span style={{color:"var(--text)"}}>City of Calgary Open Data</span> <span style={{color:"var(--dim)"}}>· zoning, assessment, permits</span></div>
                    <div style={{color:"var(--sub)"}}><span style={{color:"var(--green)",marginRight:8}}>✓</span><span style={{color:"var(--text)"}}>CMHC rental survey</span> <span style={{color:"var(--dim)"}}>· West Hillhurst CMA</span></div>
                    <div style={{color:"var(--sub)"}}><span style={{color:"var(--green)",marginRight:8}}>✓</span><span style={{color:"var(--text)"}}>active dev permits</span> <span style={{color:"var(--dim)"}}>· 20 in 1km / 24mo</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2 — Zoning + city data */}
            <div className="ld-anatomy-step">
              <div className="ld-anatomy-left">
                <div className="ld-anatomy-num">▸ STEP 02</div>
                <div className="ld-anatomy-title">Live zoning + permits.</div>
                <div className="ld-anatomy-desc">R-CG = Residential Contextual Grade. The platform pulls the exact bylaw, what's allowed by-right, the assessed value, and every nearby permit pulled in the last two years.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>ZONING · CALGARY OPEN DATA</span>
                  <span className="ld-an-bar-tag">▸ R-CG</span>
                </div>
                <div className="ld-an-body">
                  <div style={{fontFamily:"'Geist',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px"}}>
                    R-CG <span style={{fontWeight:500,color:"var(--sub)",fontSize:14}}>— Residential Contextual Grade</span>
                  </div>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--dim)",letterSpacing:"0.6px",marginTop:2,textTransform:"uppercase"}}>▸ BYLAW 1P2007 · WEST HILLHURST</div>
                  <div className="ld-an-metric-grid">
                    {[
                      {lbl:"MAX UNITS", val:"4", c:"var(--text)"},
                      {lbl:"MAX STOREYS", val:"3", c:"var(--text)"},
                      {lbl:"MAX FAR", val:"1.0", c:"var(--text)"},
                      {lbl:"ASSESSED", val:"$607K", c:"var(--text)"},
                    ].map(m => (
                      <div key={m.lbl} className="ld-an-metric">
                        <div className="ld-an-metric-lbl">{m.lbl}</div>
                        <div className="ld-an-metric-val" style={{color:m.c}}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,padding:"10px 14px",background:"rgba(52,217,138,0.05)",borderLeft:"3px solid var(--green)",borderRadius:4,fontFamily:"'Geist Mono',monospace",fontSize:11.5,color:"var(--text)"}}>
                    <span style={{color:"var(--green)",fontWeight:700,letterSpacing:1,marginRight:8}}>▸ HOT POCKET</span>
                    20 dev permits within 1km in last 24mo · 11 new builds, 9 reno
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3 — Underwriting */}
            <div className="ld-anatomy-step">
              <div className="ld-anatomy-left">
                <div className="ld-anatomy-num">▸ STEP 03</div>
                <div className="ld-anatomy-title">Real IRR. Real DSCR.</div>
                <div className="ld-anatomy-desc">Not CoC or cap-and-pray. Newton-Raphson IRR on year-by-year cash flows, DSCR after debt service, equity multiple at exit. The same math your lender will check.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>UNDERWRITING · 5YR HOLD</span>
                  <span className="ld-an-bar-tag">▸ ALL GREEN</span>
                </div>
                <div className="ld-an-body">
                  <div className="ld-an-metric-grid">
                    {[
                      {lbl:"IRR (TRUE)", val:"22.4%", c:"var(--green)"},
                      {lbl:"DSCR", val:"1.42x", c:"var(--green)"},
                      {lbl:"EQUITY MULT", val:"2.1x", c:"var(--green)"},
                      {lbl:"NET PROCEEDS", val:"$245K", c:"var(--green)"},
                    ].map(m => (
                      <div key={m.lbl} className="ld-an-metric" style={{background:"rgba(52,217,138,0.06)",borderColor:"rgba(52,217,138,0.25)"}}>
                        <div className="ld-an-metric-lbl">{m.lbl}</div>
                        <div className="ld-an-metric-val" style={{color:m.c}}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="ld-an-table">
                    <div className="ld-an-table-head">
                      <div>LINE</div><div style={{textAlign:"right"}}>Y1</div><div style={{textAlign:"right"}}>Y2</div><div style={{textAlign:"right"}}>Y3</div><div style={{textAlign:"right"}}>Y4</div><div style={{textAlign:"right"}}>Y5</div>
                    </div>
                    {[
                      {lbl:"NOI", row:["$28.5K","$29.4K","$30.3K","$31.2K","$32.1K"]},
                      {lbl:"Debt service", row:["($20.1K)","($20.1K)","($20.1K)","($20.1K)","($20.1K)"]},
                      {lbl:"BTCF ▶", row:["$8.4K","$9.3K","$10.2K","$11.1K","$12.0K"], bold:true},
                    ].map(r => (
                      <div key={r.lbl} className={`ld-an-table-row ${r.bold?"bold":""}`}>
                        <div style={{color:r.bold?"var(--green)":"var(--sub)",fontWeight:r.bold?700:500}}>{r.lbl}</div>
                        {r.row.map((v,i) => <div key={i} style={{textAlign:"right",color:r.bold?"var(--green)":"var(--text)"}}>{v}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4 — AI Thesis */}
            <div className="ld-anatomy-step">
              <div className="ld-anatomy-left">
                <div className="ld-anatomy-num">▸ STEP 04</div>
                <div className="ld-anatomy-title">AI thesis. 900-word memo.</div>
                <div className="ld-anatomy-desc">Sonnet 4.6 writes the deal up like an associate would for IC. Risks, opportunities, and the case for why this deal pencils. Not just a number — a narrative.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>AI THESIS · CLAUDE SONNET 4.6</span>
                  <span className="ld-an-bar-tag">▸ 12S</span>
                </div>
                <div className="ld-an-body">
                  <div className="ld-an-thesis">
                    <div className="ld-an-thesis-bar">
                      <div style={{fontSize:22}}>🤖</div>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10.5,fontWeight:700,color:"var(--green)",letterSpacing:1.2}}>INSTITUTIONAL MEMO · EXCERPT</div>
                    </div>
                    <div className="ld-an-thesis-text">
                      "R-CG zoning permits up to 4 units on a $607K assessed parcel, putting the by-right unit count materially above current use. West Hillhurst pulled 20 development permits in the last 24 months — 11 new builds, 9 renovations — signaling an active redevelopment pocket with comp velocity. At 22.4% IRR and 1.42x DSCR on 5-year stabilized rents derived from CMHC West Hillhurst median ($1,890/2BR), this pencils as a multifamily infill play. <strong style={{color:"var(--green)"}}>Recommendation: pursue with a 6-week diligence window</strong>; primary risks are construction cost overruns and rent absorption above $2,100..."
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 5 — Output */}
            <div className="ld-anatomy-step">
              <div className="ld-anatomy-left">
                <div className="ld-anatomy-num">▸ STEP 05</div>
                <div className="ld-anatomy-title">Save it. Export it. Send it.</div>
                <div className="ld-anatomy-desc">One click for the investor PDF. One click for the lender package. One click to save it to your pipeline. Built for showing partners, lenders, and ICs — not just yourself.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>OUTPUT · INVESTOR-READY</span>
                  <span className="ld-an-bar-tag">▸ 1 CLICK</span>
                </div>
                <div className="ld-an-body">
                  <div className="ld-an-output-row">
                    <div className="ld-an-output-chip"><span className="ld-an-output-icon">📄</span><span>Deal PDF · branded</span></div>
                    <div className="ld-an-output-chip"><span className="ld-an-output-icon">🏦</span><span>Lender Package</span></div>
                    <div className="ld-an-output-chip"><span className="ld-an-output-icon">💾</span><span>Save to pipeline</span></div>
                  </div>
                  <div style={{marginTop:14,padding:"12px 14px",background:"rgba(59,158,255,0.05)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:4,fontFamily:"'Geist',sans-serif",fontSize:12.5,color:"var(--sub)",lineHeight:1.6}}>
                    Total time, address → polished PDF: <strong style={{color:"var(--blue)"}}>under 60 seconds</strong>. Same workflow you'd run in 4 hours of Excel.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PRO OUTPUTS SHOWCASE — what your investors / lenders / IC see ── */}
      <section className="ld-pro fade">
        <div className="ld-pro-inner">
          <div className="ld-pro-head">
            <div className="ld-section-tag">Pro outputs</div>
            <h2 className="ld-section-title">What you hand to your lender.<br /><span>Not what BiggerPockets gives you.</span></h2>
            <p className="ld-section-sub">Three institutional documents, generated from every deal. Branded with your name. Ready for IC.</p>
          </div>

          <div className="ld-pro-grid">

            {/* IC Memo */}
            <div className="ld-pro-card" onClick={scrollToAuth}>
              <div className="ld-pro-doc">
                <div className="ld-pro-doc-header">
                  <div className="ld-pro-doc-logo">Rize<span>AI</span></div>
                  <div className="ld-pro-doc-type">IC MEMO</div>
                </div>
                <div className="ld-pro-doc-body">
                  <div className="ld-pro-doc-title">Investment Committee Memorandum</div>
                  <div className="ld-pro-doc-sub">2424 Westmount Rd NW · Calgary, AB · R-CG</div>
                  <div className="ld-pro-doc-bar" />
                  <div className="ld-pro-doc-watermark">▸ GO · IRR 22.4%</div>

                  <div className="ld-pro-doc-section">Executive Summary</div>
                  <div className="ld-pro-doc-para">Acquisition of a 4-unit by-right infill site in an active West Hillhurst redevelopment pocket. Stabilized IRR of 22.4%, DSCR 1.42x, equity multiple 2.1x over 5-year hold...</div>

                  <div className="ld-pro-doc-section">Return Metrics</div>
                  <div className="ld-pro-doc-row"><span>Levered IRR</span><span>22.4%</span></div>
                  <div className="ld-pro-doc-row"><span>Year-1 DSCR</span><span>1.42x</span></div>
                  <div className="ld-pro-doc-row"><span>Equity Multiple</span><span>2.1x</span></div>
                  <div className="ld-pro-doc-row"><span>Net Proceeds (Yr5)</span><span>$245K</span></div>

                  <div className="ld-pro-doc-section">Recommendation</div>
                  <div className="ld-pro-doc-para"><em>Pursue with 6-week diligence window. Primary risks: construction cost overruns, rent absorption &gt; $2,100/2BR...</em></div>
                </div>
                <div className="ld-pro-doc-footer">
                  <span>RIZE AI · GENERATED 2026-06-07</span>
                  <span>p. 1 / 9</span>
                </div>
              </div>
              <div className="ld-pro-meta">
                <div className="ld-pro-meta-tag">▸ INSTITUTIONAL</div>
                <div className="ld-pro-meta-title">IC Memo · 9 pages</div>
                <div className="ld-pro-meta-desc">Executive summary, return waterfall, risk matrix, comp set, exit scenarios. Ready to walk into an investment committee.</div>
                <div className="ld-pro-meta-cta">▶ INCLUDED IN PRO</div>
              </div>
            </div>

            {/* Lender Package */}
            <div className="ld-pro-card" onClick={scrollToAuth}>
              <div className="ld-pro-doc">
                <div className="ld-pro-doc-header">
                  <div className="ld-pro-doc-logo">Rize<span>AI</span></div>
                  <div className="ld-pro-doc-type">LENDER PKG</div>
                </div>
                <div className="ld-pro-doc-body">
                  <div className="ld-pro-doc-title">Loan Request Package</div>
                  <div className="ld-pro-doc-sub">Submitted to: CHMIC · Calgary, AB</div>
                  <div className="ld-pro-doc-bar" style={{background:"var(--green)"}}/>
                  <div className="ld-pro-doc-watermark" style={{color:"rgba(52,217,138,0.65)",borderColor:"rgba(52,217,138,0.5)"}}>▸ DSCR 1.42x</div>

                  <div className="ld-pro-doc-section">Loan Terms</div>
                  <div className="ld-pro-doc-row"><span>Loan Amount</span><span>$540,000</span></div>
                  <div className="ld-pro-doc-row"><span>LTV</span><span>75%</span></div>
                  <div className="ld-pro-doc-row"><span>Rate / Amort</span><span>6.49% / 30Y</span></div>
                  <div className="ld-pro-doc-row"><span>Monthly P&amp;I</span><span>$3,408</span></div>

                  <div className="ld-pro-doc-section">DSCR Stress</div>
                  <div className="ld-pro-doc-row"><span>Base case</span><span>1.42x</span></div>
                  <div className="ld-pro-doc-row"><span>−5% rent</span><span>1.31x</span></div>
                  <div className="ld-pro-doc-row"><span>−10% rent</span><span>1.20x</span></div>

                  <div className="ld-pro-doc-section">Borrower</div>
                  <div className="ld-pro-doc-para"><em>5 deals closed · personal NW &amp; pipeline attached as Appendix A / B...</em></div>
                </div>
                <div className="ld-pro-doc-footer">
                  <span>RIZE AI · GENERATED 2026-06-07</span>
                  <span>p. 1 / 6</span>
                </div>
              </div>
              <div className="ld-pro-meta">
                <div className="ld-pro-meta-tag">▸ FUND-READY</div>
                <div className="ld-pro-meta-title">Lender Package · 6 pages</div>
                <div className="ld-pro-meta-desc">Loan request, DSCR stress test, borrower profile, NOI projections, exit. The doc your lender actually wants.</div>
                <div className="ld-pro-meta-cta">▶ INCLUDED IN PRO</div>
              </div>
            </div>

            {/* Deal Report */}
            <div className="ld-pro-card" onClick={scrollToAuth}>
              <div className="ld-pro-doc">
                <div className="ld-pro-doc-header">
                  <div className="ld-pro-doc-logo">Rize<span>AI</span></div>
                  <div className="ld-pro-doc-type">DEAL REPORT</div>
                </div>
                <div className="ld-pro-doc-body">
                  <div className="ld-pro-doc-title">Underwriting Report</div>
                  <div className="ld-pro-doc-sub">BRRRR · 2424 Westmount Rd NW</div>
                  <div className="ld-pro-doc-bar" style={{background:"var(--purple)"}}/>
                  <div className="ld-pro-doc-watermark" style={{color:"rgba(167,130,255,0.65)",borderColor:"rgba(167,130,255,0.5)"}}>▸ CASH RECYCLE 92%</div>

                  <div className="ld-pro-doc-section">BRRRR Cycle</div>
                  <div className="ld-pro-doc-row"><span>All-in basis</span><span>$782K</span></div>
                  <div className="ld-pro-doc-row"><span>ARV (stabilized)</span><span>$1.04M</span></div>
                  <div className="ld-pro-doc-row"><span>Cash recycled</span><span>$185K</span></div>
                  <div className="ld-pro-doc-row"><span>Cash left in</span><span>$15K</span></div>

                  <div className="ld-pro-doc-section">5-Yr CoC</div>
                  <div className="ld-pro-doc-row"><span>Yr 1</span><span>+18.3%</span></div>
                  <div className="ld-pro-doc-row"><span>Yr 3</span><span>+24.1%</span></div>
                  <div className="ld-pro-doc-row"><span>Yr 5</span><span>+31.6%</span></div>

                  <div className="ld-pro-doc-section">Sensitivity</div>
                  <div className="ld-pro-doc-para"><em>6×6 grid of IRR across rent growth × exit cap. Base case bordered in green...</em></div>
                </div>
                <div className="ld-pro-doc-footer">
                  <span>RIZE AI · GENERATED 2026-06-07</span>
                  <span>p. 1 / 4</span>
                </div>
              </div>
              <div className="ld-pro-meta">
                <div className="ld-pro-meta-tag">▸ FOR YOU + PARTNERS</div>
                <div className="ld-pro-meta-title">Deal Report · 4 pages</div>
                <div className="ld-pro-meta-desc">Full BRRRR / multifamily underwriting with sensitivity grid. The reference doc for every deal you analyze.</div>
                <div className="ld-pro-meta-cta">▶ FREE FOR EVERY DEAL</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BEFORE/AFTER DEAL TRANSLATOR — interactive slider ──
          Status reversal made physical. Drag the slider: the messy broker
          OM on the left dissolves into the clean RizeAI dashboard on the
          right. Same deal, same numbers, different fluency. */}
      <section className="ld-translator fade">
        <div className="ld-translator-inner">
          <div className="ld-translator-head">
            <div className="ld-section-tag">Deal translator · before / after</div>
            <h2 className="ld-translator-title">Stop deciphering. <span>Start deciding.</span></h2>
            <p className="ld-translator-sub">
              Same deal. Drag the slider. Watch the broker's 47-page Offering
              Memorandum dissolve into the three numbers that actually decide
              whether you bid.
            </p>
          </div>

          <div className="ld-trans-stage">
            <div className="ld-trans-side ld-trans-before">
              <div className="ld-trans-side-tag">▸ THE BROKER'S OM · CHAOS</div>
              <div className="ld-trans-om">
                <div className="ld-trans-om-title">CONFIDENTIAL OFFERING MEMORANDUM</div>
                <div className="ld-trans-om-sub">24-Unit Multifamily · Calgary AB · 47pp.</div>
                <div className="ld-trans-om-noise">
                  <div className="ld-trans-line w1">Cap rate (in-place):  6.8%  •  pro-forma:  7.4%  •  stabilized:  8.1%</div>
                  <div className="ld-trans-line w2">Gross scheduled inc:  $487,200 (broker)  •  actual T-12:  $441,800</div>
                  <div className="ld-trans-line w3">Vacancy assumption:  3%  (market: 4.6% CMHC)  •  bad debt:  1.5%</div>
                  <div className="ld-trans-line w1">Repairs &amp; maint:    $18,500  (assessed:  $34,200 — deferred capex)</div>
                  <div className="ld-trans-line w2">Mgmt fee:           4%  (typical:  6-8%)   •  reserves:  $0  (typ:  $250/u)</div>
                  <div className="ld-trans-line w3">Property tax:       2024 levy + 4.2% assessment growth + supplementary…</div>
                  <div className="ld-trans-line w1">Utilities:          tenant-paid? landlord-paid? master-metered? — see p.28</div>
                  <div className="ld-trans-line w2">Insurance:          quote pending  •  estimated  $1,150/u  (per broker)</div>
                  <div className="ld-trans-line w3">"Significant upside through targeted renovation and rent realignment"</div>
                  <div className="ld-trans-line w1">See Exhibit A, B, C, D, E, F for comp set assumptions and adjustments…</div>
                  <div className="ld-trans-line w2">Rent roll attached as Appendix 1 (T-12) + Appendix 2 (current month)…</div>
                </div>
              </div>
            </div>

            <div className="ld-trans-side ld-trans-after">
              <div className="ld-trans-side-tag">▸ THE RIZEAI READ · CLARITY</div>
              <div className="ld-trans-dash">
                <div className="ld-trans-dash-head">
                  <span className="ld-trans-dash-dot" />
                  RIZE AI · DEAL READ · 11s
                </div>
                <div className="ld-trans-dash-row">
                  <span className="ld-trans-dash-lbl">True NOI (normalized)</span>
                  <span className="ld-trans-dash-val">$268,400</span>
                </div>
                <div className="ld-trans-dash-row">
                  <span className="ld-trans-dash-lbl">Actual cap rate</span>
                  <span className="ld-trans-dash-val">5.6%</span>
                </div>
                <div className="ld-trans-dash-row hl">
                  <span className="ld-trans-dash-lbl">Max Allowable Offer</span>
                  <span className="ld-trans-dash-val">$4.21M</span>
                </div>
                <div className="ld-trans-dash-verdict">
                  <div className="ld-trans-dash-grade">B+</div>
                  <div className="ld-trans-dash-verdict-body">
                    <div className="ld-trans-dash-verdict-lbl">CONDITIONAL GO</div>
                    <div className="ld-trans-dash-verdict-sub">
                      Bid 12.3% under ask. Broker pro-forma adds $45K of phantom rent —
                      true cap is 5.6%, not 7.4%.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The overlay clip that hides the AFTER side until slider drags */}
            <div
              className="ld-trans-clip"
              style={{ clipPath: `polygon(${beforeAfter}% 0, 100% 0, 100% 100%, ${beforeAfter}% 100%)` }}
            />

            {/* Drag handle */}
            <div className="ld-trans-handle" style={{ left: `${beforeAfter}%` }}>
              <div className="ld-trans-handle-bar" />
              <div className="ld-trans-handle-grip">⇆</div>
            </div>

            <input
              type="range"
              className="ld-trans-range"
              min="0"
              max="100"
              value={beforeAfter}
              onChange={(e) => setBeforeAfter(Number(e.target.value))}
            />
          </div>

          <div className="ld-translator-foot">
            <span>← BROKER OM</span>
            <span className="ld-translator-foot-mid">DRAG TO TRANSLATE</span>
            <span>RIZEAI READ →</span>
          </div>
        </div>
      </section>

      {/* ── DAILY RITUAL — "your new morning ceremony" ──
          The product-as-religion beat. Visualises logging in with morning
          coffee as the daily ritual that grounds the day in intelligence. */}
      <section className="ld-ritual fade" style={{
        padding:"96px 24px",
        background:"linear-gradient(180deg,rgba(15,23,42,0.02) 0%,rgba(0,102,204,0.04) 50%,rgba(15,23,42,0.02) 100%)",
        position:"relative",
      }}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center"}}>
          <div>
            <div className="ld-section-tag" style={{textAlign:"left",marginBottom:14}}>Your new morning ceremony</div>
            <h2 className="ld-section-title" style={{textAlign:"left",fontSize:"clamp(28px,3.6vw,44px)",lineHeight:1.1,marginBottom:18}}>
              Before the market wakes up,<br /><span>you're already informed.</span>
            </h2>
            <p style={{fontSize:16.5,color:"var(--sub)",lineHeight:1.75,marginBottom:24}}>
              The way operators check Bloomberg with their coffee — that's RizeAI on your phone before you even pour the second cup. Off-market signals from the last 24h. Zoning shifts in your target markets. The three deals worth a closer read. No overwhelm. Just pure, actionable intelligence.
            </p>
            <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:12}}>
              {[
                {time:"07:00",text:"Daily Market Brief lands in your inbox — Calgary, YYZ, BC sub-markets in one read"},
                {time:"07:05",text:"Three flagged signals from saved Triggers · two STRONG, one OK"},
                {time:"07:12",text:"You've already routed two to your lender. The day hasn't started."},
              ].map((row,i) => (
                <li key={i} style={{
                  display:"grid",gridTemplateColumns:"60px 1fr",gap:14,alignItems:"start",
                  padding:"10px 0",
                  borderBottom: i < 2 ? "1px solid var(--borderf)" : "none",
                }}>
                  <span style={{fontFamily:"'Geist Mono',monospace",fontSize:12,fontWeight:700,color:"var(--blue)",letterSpacing:"0.5px"}}>{row.time}</span>
                  <span style={{fontSize:13.5,color:"var(--text)",lineHeight:1.55}}>{row.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{position:"relative"}}>
            <div style={{
              background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)",
              borderRadius:14,
              padding:"22px 22px 26px",
              boxShadow:"0 32px 90px rgba(0,102,204,0.2)",
              border:"1px solid rgba(255,204,0,0.15)",
              position:"relative",overflow:"hidden",
            }}>
              <div style={{
                display:"flex",alignItems:"center",gap:8,marginBottom:18,
                fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,
                color:"rgba(255,255,255,0.85)",letterSpacing:"1.2px",
              }}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"#ffcc00",boxShadow:"0 0 10px #ffcc00",animation:"blink 2s infinite"}} />
                07:00 · DAILY MARKET BRIEF · CALGARY
              </div>

              <div style={{color:"#ffcc00",fontSize:10,fontWeight:800,letterSpacing:"1.3px",fontFamily:"'Geist Mono',monospace",marginBottom:8}}>▸ AI READ · TODAY'S TAKE</div>
              <div style={{color:"rgba(255,255,255,0.95)",fontSize:13.5,lineHeight:1.6,marginBottom:18,fontStyle:"italic"}}>
                "BoC held at 4.5% — Storeys flags YYC condo listings up 18% MoM, suggesting buyer's-market window for multifamily acquisitions before fall."
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  {title:"Calgary 6-plex on Centre St. drops $50K",pill:"STRONG",pillColor:"#16a34a"},
                  {title:"YYC NE land assembly · 3 lots same owner",pill:"OK",pillColor:"#ffcc00"},
                  {title:"Storeys: BoC rate-decision day Thursday",pill:"WATCH",pillColor:"#0066cc"},
                ].map((row,i) => (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"10px 12px",
                    background:"rgba(255,255,255,0.06)",
                    backdropFilter:"blur(10px)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:5,
                  }}>
                    <span style={{flex:1,color:"#ffffff",fontSize:12.5,fontWeight:500}}>{row.title}</span>
                    <span style={{
                      fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:800,
                      letterSpacing:"0.8px",padding:"3px 7px",borderRadius:3,
                      background:row.pillColor,color:"#0f172a",
                    }}>{row.pill}</span>
                  </div>
                ))}
              </div>

              <div style={{position:"absolute",top:-50,right:-50,width:200,height:200,background:"radial-gradient(circle,rgba(255,204,0,0.15) 0%,transparent 70%)",pointerEvents:"none"}} />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE RIZE ETHOS — manifesto ──
          The Hidden Door positioning. Frames RizeAI not as "tool I bought"
          but "ecosystem I joined." Builds the movement / legacy framing. */}
      <section className="ld-ethos fade" style={{padding:"96px 24px",textAlign:"center",position:"relative"}}>
        <div style={{maxWidth:780,margin:"0 auto"}}>
          <div className="ld-section-tag">The RizeAI ethos</div>
          <h2 className="ld-section-title" style={{marginBottom:24,lineHeight:1.18}}>Real estate isn't a transaction.<br /><span>It's literacy in a market that locked you out.</span></h2>
          <p style={{fontSize:17,color:"var(--sub)",lineHeight:1.75,marginBottom:20,maxWidth:680,margin:"0 auto 20px"}}>
            For decades the institutional desks held the data, the math, and the language. They had analysts running Newton-Raphson IRR while you ran "purchase × 7%" on the back of an envelope. The room had a door, and you weren't supposed to find it.
          </p>
          <p style={{fontSize:17,color:"var(--text)",lineHeight:1.75,marginBottom:32,fontWeight:600,maxWidth:680,margin:"0 auto 32px"}}>
            RizeAI is the door. Same infrastructure. Same fluency. In your pocket. Free during launch.
          </p>
          <div style={{
            display:"inline-block",
            padding:"14px 22px",
            background:"linear-gradient(135deg,rgba(0,102,204,0.05) 0%,rgba(255,204,0,0.05) 100%)",
            border:"1px solid rgba(0,102,204,0.18)",
            borderLeft:"3px solid #ffcc00",
            borderRadius:6,
            fontFamily:"'Geist Mono',monospace",fontSize:11.5,fontWeight:700,
            color:"var(--text)",letterSpacing:"0.8px",
          }}>
            ▸ NOT A SOFTWARE PURCHASE. A STATUS UPGRADE.
          </div>
        </div>
      </section>

      {/* ── WHY WE BUILT THIS — motion-graphic sizzle reel ── */}
      <section className="ld-why fade">
        <div className="ld-why-inner">
          <div className="ld-why-head">
            <div className="ld-section-tag">// Why we built this</div>
            <h2 className="ld-section-title">A story we kept hearing.<br /><span>So we did something about it.</span></h2>
            <p className="ld-section-sub" style={{maxWidth:560,margin:"14px auto 0"}}>Real investors. Real frustration. Six seconds is all it should take to know if a deal is worth your time.</p>
          </div>
          <div className="ld-whyvid" style={{
            position:"relative",
            background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)",
            border:"1px solid rgba(255,204,0,0.15)",
            borderLeft:"4px solid #ffcc00",
            borderRadius:12,
            overflow:"hidden",
            boxShadow:"0 32px 80px rgba(0,102,204,0.18),0 0 0 1px rgba(0,102,204,0.08) inset",
          }}>
            {/* Terminal-style header bar */}
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"11px 18px",
              background:"rgba(15,23,42,0.55)",
              backdropFilter:"blur(12px)",
              WebkitBackdropFilter:"blur(12px)",
              borderBottom:"1px solid rgba(255,255,255,0.08)",
              fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,
              letterSpacing:"1.2px",color:"rgba(255,255,255,0.85)",
            }}>
              <span style={{width:8,height:8,borderRadius:"50%",background:"#ffcc00",boxShadow:"0 0 10px #ffcc00",animation:"blink 2s infinite"}} />
              <span style={{flex:1,textTransform:"uppercase"}}>RIZE AI · MOTION REEL · 0:42</span>
              <span style={{color:"#ffcc00"}}>▸ LIVE</span>
            </div>
            <video
              ref={whyVideoRef}
              src={whyVideoLoaded ? "/why-we-built.mp4" : undefined}
              autoPlay
              muted
              loop
              playsInline
              preload={whyVideoLoaded ? "auto" : "none"}
              style={{display:"block",width:"100%",height:"auto",aspectRatio:"16/9",background:"#0f172a"}}
            />
            {/* Gold + blue corner glows for brand presence */}
            <div style={{position:"absolute",top:0,right:0,width:260,height:260,background:"radial-gradient(circle,rgba(255,204,0,0.12) 0%,transparent 70%)",pointerEvents:"none"}} />
            <div style={{position:"absolute",bottom:0,left:0,width:260,height:260,background:"radial-gradient(circle,rgba(0,102,204,0.18) 0%,transparent 70%)",pointerEvents:"none"}} />
          </div>
        </div>
      </section>

      {/* ── TRY IT LIVE: the interactive mini-calc (moved out of the hero) ── */}
      <div id="try-it-live" style={{padding:"56px 24px 8px",maxWidth:1140,margin:"0 auto"}}>
        <div className="ld-section-tag" style={{textAlign:"left",marginBottom:8}}>Try it live</div>
        <h2 className="ld-section-title" style={{textAlign:"left",fontSize:"clamp(24px,3vw,34px)"}}>Edit any number. Verdict updates in real time.</h2>
        <p className="ld-section-sub" style={{textAlign:"left",margin:"0 0 28px"}}>The same engine that powers the video. Drop your own deal in — no signup required.</p>
        <div className="ld-hcalc" style={{maxWidth:560}}>
          <div className="ld-hcalc-bar">
            <span className="ld-hcalc-dot" />
            <span className="ld-hcalc-bar-label">RIZE AI TERMINAL · v2.0</span>
            <span className="ld-hcalc-bar-status">▸ LIVE</span>
          </div>
          <div className="ld-hcalc-sub">Try it instantly. Edit any number — verdict updates in real time.</div>

          <div className="ld-hcalc-grid">
            <label className="ld-hcalc-field">
              <span className="ld-hcalc-lbl">ARV (after-repair)</span>
              <input className="ld-hcalc-input" type="number" value={dArv} onChange={e=>setDArv(e.target.value)} />
            </label>
            <label className="ld-hcalc-field">
              <span className="ld-hcalc-lbl">Purchase Price</span>
              <input className="ld-hcalc-input" type="number" value={dPurchase} onChange={e=>setDPurchase(e.target.value)} />
            </label>
            <label className="ld-hcalc-field">
              <span className="ld-hcalc-lbl">Repairs</span>
              <input className="ld-hcalc-input" type="number" value={dRepair} onChange={e=>setDRepair(e.target.value)} />
            </label>
            <label className="ld-hcalc-field">
              <span className="ld-hcalc-lbl">Hold (months)</span>
              <input className="ld-hcalc-input" type="number" value={dHold} onChange={e=>setDHold(e.target.value)} />
            </label>
          </div>

          <div className="ld-hcalc-verdict" style={{borderColor:dGrade.c+"40",background:dGrade.c+"0d"}}>
            <div className="ld-hcalc-grade" style={{color:dGrade.c,borderColor:dGrade.c+"50"}}>{dGrade.g}</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="ld-hcalc-verdict-lbl" style={{color:dGrade.c}}>{dGrade.label.replace(/[✅⚠️🚫]\s*/,"")}</div>
              <div className="ld-hcalc-verdict-sub">{demo.margin>0.20?"Margin exceeds 20% institutional threshold":demo.margin>0.12?"Margin acceptable; verify repair scope":demo.margin>0.05?"Thin margin — negotiate price down":"Numbers do not pencil"}</div>
            </div>
            <div className="ld-hcalc-verdict-roi" style={{color:demo.profit>=0?"var(--green)":"var(--red)"}}>
              {demo.profit>=0?"▲ ":"▼ "}{fmtPct(demo.margin*100)}
            </div>
          </div>

          <div className="ld-hcalc-rows">
            <div className="ld-hcalc-row"><span>Net Profit</span><span className={demo.profit>=0?"pos":"neg"}>{fmt(demo.profit)}</span></div>
            <div className="ld-hcalc-row"><span>All-In Cost</span><span>{fmt(demo.totalCost)}</span></div>
            <div className="ld-hcalc-row"><span>70% Rule Max</span><span style={{color:"var(--sub)"}}>{fmt(num(dArv)*0.70 - num(dRepair))}</span></div>
          </div>

          <a href="#auth-section" className="ld-hcalc-cta">→ Save this deal — sign up free</a>
          <div className="ld-hcalc-foot">No credit card · 4,180+ deals analyzed</div>
        </div>
      </div>

      {/* ── AUTH SECTION (moved out of hero so the mini-calc gets primary placement) ── */}
      <div className="ld-auth-section">
        <div className="ld-auth-card" id="auth-section">
          <div className="ld-auth-title">Apply for access.</div>
          <div className="ld-auth-sub">By invitation. Same AI infrastructure the institutional desks use — now extended to a select circle of operators.</div>
          <div className="ld-tabs">
            <button className={`ld-tab ${mode === "signup" ? "active" : "inactive"}`} onClick={() => { setMode("signup"); setAuthError(""); setShowPass(false); }}>Unlock access</button>
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

      {/* ── WHY RIZE AI ── */}
      <div className="ld-section fade">
        <div className="ld-section-tag">Why RizeAI</div>
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




      {/* ── CHROME EXTENSION SHOWCASE ── */}
      <section className="ld-chrome fade">
        <div className="ld-chrome-inner">
          <div className="ld-chrome-head">
            <div className="ld-section-tag">Browser extension</div>
            <h2>Underwrite without<br /><span>leaving the listing.</span></h2>
            <p>One click on any Realtor.ca, Zillow, or Redfin listing — RizeAI scrapes the price, beds, baths, sqft straight off the page and opens the full analyzer pre-populated. No retyping.</p>

            <div className="ld-chrome-chips">
              <div className="ld-chrome-chip"><span className="glyph">●</span><span><strong style={{color:"var(--text)"}}>Realtor.ca · Zillow · Redfin</strong> <span style={{color:"var(--dim)"}}>— covered out of the box</span></span></div>
              <div className="ld-chrome-chip"><span className="glyph">●</span><span><strong style={{color:"var(--text)"}}>JSON-LD + DOM fallback scraping</strong> <span style={{color:"var(--dim)"}}>— survives site redesigns</span></span></div>
              <div className="ld-chrome-chip"><span className="glyph">●</span><span><strong style={{color:"var(--text)"}}>Zero data collection</strong> <span style={{color:"var(--dim)"}}>— reads the page you're on, that's it</span></span></div>
            </div>

            <button className="ld-chrome-cta" onClick={() => setInstallOpen(v => !v)}>
              ▶ {installOpen ? "HIDE INSTRUCTIONS" : "GET THE EXTENSION"}
            </button>
            <a className="ld-chrome-secondary" href="https://github.com/sunrizeinvest-oss/RealMonopoly/tree/master/chrome-extension" target="_blank" rel="noopener">▸ VIEW SOURCE</a>

            <div className={`ld-chrome-install ${installOpen ? "open" : ""}`}>
              <div className="ld-chrome-install-h">▸ INSTALL · 30 SECONDS</div>
              <div className="ld-chrome-install-step">
                <span className="n">1</span>
                <span>Download the extension folder from <a href="https://github.com/sunrizeinvest-oss/RealMonopoly/tree/master/chrome-extension" target="_blank" rel="noopener" style={{color:"var(--blue)"}}>GitHub</a> (or clone the repo).</span>
              </div>
              <div className="ld-chrome-install-step">
                <span className="n">2</span>
                <span>Open <span className="ld-chrome-install-code">chrome://extensions/</span> and toggle <strong>Developer mode</strong> on (top-right).</span>
              </div>
              <div className="ld-chrome-install-step">
                <span className="n">3</span>
                <span>Click <strong>Load unpacked</strong> → select the <span className="ld-chrome-install-code">chrome-extension/</span> folder.</span>
              </div>
              <div className="ld-chrome-install-step">
                <span className="n">4</span>
                <span>Pin the green-dot icon. Visit a listing on Realtor.ca / Zillow / Redfin and click it.</span>
              </div>
            </div>
          </div>

          {/* Browser frame mock with extension popup overlay */}
          <div className="ld-chrome-stage">
            <div className="ld-browser">
              <div className="ld-browser-bar">
                <div className="ld-browser-dots">
                  <span style={{background:"#ff5f57"}} />
                  <span style={{background:"#febc2e"}} />
                  <span style={{background:"#28c840"}} />
                </div>
                <div className="ld-browser-url">
                  <span className="lock">🔒</span>
                  realtor.ca/real-estate/2424-westmount-rd-nw-calgary
                </div>
                <div className="ld-browser-tools">
                  <span className="tool">⊞</span>
                  <span className="tool active" title="RizeAI extension">●</span>
                </div>
              </div>
              <div className="ld-browser-body">
                <div className="ld-browser-listing">
                  <div className="ld-browser-listing-hero">Listing photo · 2424 Westmount Rd NW</div>
                  <div className="ld-browser-listing-meta">
                    <div className="ld-browser-listing-price">$720,000</div>
                    <div className="ld-browser-listing-addr">2424 Westmount Rd NW, Calgary, AB</div>
                    <div className="ld-browser-listing-stats">
                      <span><strong>4</strong> beds</span>
                      <span><strong>2.5</strong> baths</span>
                      <span><strong>1,850</strong> sqft</span>
                      <span><strong>R-CG</strong></span>
                    </div>
                  </div>
                </div>

                {/* RizeAI extension popup overlay */}
                <div className="ld-rd-popup">
                  <div className="ld-rd-popup-bar">
                    <span className="ld-rd-popup-dot" />
                    <span className="ld-rd-popup-title">RIZE AI</span>
                    <span className="ld-rd-popup-tag">▸ REALTOR.CA</span>
                  </div>
                  <div className="ld-rd-popup-body">
                    <div className="ld-rd-popup-eyebrow">▸ DETECTED LISTING</div>
                    <div className="ld-rd-popup-addr">2424 Westmount Rd NW, Calgary, AB</div>
                    <div className="ld-rd-popup-grid">
                      <div className="ld-rd-popup-cell full"><div className="lbl">List price</div><div className="val green">$720,000</div></div>
                      <div className="ld-rd-popup-cell"><div className="lbl">Beds</div><div className="val">4</div></div>
                      <div className="ld-rd-popup-cell"><div className="lbl">Baths</div><div className="val">2.5</div></div>
                      <div className="ld-rd-popup-cell full"><div className="lbl">Sq Ft</div><div className="val">1,850</div></div>
                    </div>
                    <div className="ld-rd-popup-cta">▶ UNDERWRITE AS FLIP</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <div className="ld-mock-logo">Rize<span>AI</span></div>
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
              <div className="ld-testi-stars">{"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "var(--amber)" }}>{s}</span>)}</div>
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
            <a href="mailto:kaelan@chmic.ca?subject=RizeAI%20Referral" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--blue)", color: "#fff", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>📩 Email Kaelan at CHMIC</a>
            <a href="tel:5875854571" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "var(--sub)", border: "1px solid var(--borderf)", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>📞 587-585-4571</a>
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
          <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius: 16,padding:"32px 28px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Free</div>
            <div style={{fontSize:42,fontWeight:800,color:"var(--text)",letterSpacing:"-2px",marginBottom:4}}>$0</div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:24}}>Forever free during beta</div>
            <button onClick={scrollToAuth} style={{width:"100%",background:"rgba(15,23,42,0.06)",border:"1px solid var(--borderf)",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"var(--text)",cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>Get started free →</button>
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
          <div style={{background:"linear-gradient(135deg,rgba(59,158,255,0.07),var(--card))",border:"1px solid rgba(59,158,255,0.3)",borderRadius: 16,padding:"32px 28px",position:"relative"}}>
            <div style={{position:"absolute",top:-12,right:20,background:"linear-gradient(135deg,var(--blue),var(--purple))",color:"#fff",fontSize:11,fontWeight:800,padding:"4px 14px",borderRadius:99,letterSpacing:"0.5px"}}>MOST POPULAR</div>
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

      {/* ── UNSEEN MARKET PULSE — AB/BC map + live ticker, gated ──
          Faintly glowing AB/BC silhouette. Pulse dots mark cities. A live
          counter ticks up alongside dynamic ticker text. Clicking a pulse
          triggers the "Institutional intelligence is gated" prompt. */}
      <section className="ld-pulse fade">
        <div className="ld-pulse-inner">
          <div className="ld-pulse-tag">// Live off-market discovery · AB &amp; BC</div>
          <h2 className="ld-pulse-title">The unseen market <span>pulses</span> in real time.</h2>
          <p className="ld-pulse-sub">
            While you scroll, our algorithm is scanning permit filings, title
            transfers, and zoning bylaws. Off-market deals surface here the
            instant they exist — gated until you're inside the ecosystem.
          </p>

          <div className="ld-pulse-stage">
            {/* AB / BC silhouette map — stylized SVG with city pulse dots */}
            <div className="ld-pulse-map">
              <svg viewBox="0 0 480 360" className="ld-pulse-svg" aria-hidden="true">
                {/* BC + AB silhouette (stylized) */}
                <path
                  d="M 30 40 L 30 280 L 110 320 L 230 330 L 280 320 L 280 40 L 230 30 L 110 30 Z"
                  fill="rgba(33,85,205,0.04)"
                  stroke="rgba(212,175,55,0.3)"
                  strokeWidth="1"
                />
                {/* Vertical divider between BC and AB */}
                <line x1="160" y1="40" x2="160" y2="320" stroke="rgba(212,175,55,0.18)" strokeWidth="0.75" strokeDasharray="3 4" />
                {/* Province labels */}
                <text x="95" y="85" fill="rgba(212,175,55,0.55)" fontFamily="Geist Mono" fontSize="9" letterSpacing="1.8">BC</text>
                <text x="220" y="85" fill="rgba(212,175,55,0.55)" fontFamily="Geist Mono" fontSize="9" letterSpacing="1.8">AB</text>

                {/* Pulse markers — Vancouver, Calgary, Edmonton, Kelowna, Victoria */}
                {[
                  { cx: 90,  cy: 245, city: "VANCOUVER",  pop: 1 },
                  { cx: 215, cy: 195, city: "CALGARY",    pop: 2 },
                  { cx: 220, cy: 140, city: "EDMONTON",   pop: 3 },
                  { cx: 115, cy: 220, city: "KELOWNA",    pop: 1 },
                  { cx: 70,  cy: 270, city: "VICTORIA",   pop: 1 },
                ].map((m) => (
                  <g key={m.city}>
                    <circle cx={m.cx} cy={m.cy} r="3" fill="var(--brass)" />
                    <circle cx={m.cx} cy={m.cy} r="6" fill="none" stroke="var(--brass)" strokeWidth="1" opacity="0.5">
                      <animate attributeName="r" from="3" to="22" dur="2.4s" repeatCount="indefinite" begin={`${m.pop * 0.4}s`} />
                      <animate attributeName="opacity" from="0.65" to="0" dur="2.4s" repeatCount="indefinite" begin={`${m.pop * 0.4}s`} />
                    </circle>
                    <text x={m.cx + 11} y={m.cy + 3} fill="var(--alabaster-2)" fontFamily="Geist Mono" fontSize="8.5" letterSpacing="1.2">{m.city}</text>
                  </g>
                ))}
              </svg>

              {/* "Gated" prompt that appears on click */}
              <button
                className="ld-pulse-gate"
                onClick={scrollToAuth}
                aria-label="Institutional intelligence is gated"
              >
                <div className="ld-pulse-gate-icon">▲</div>
                <div className="ld-pulse-gate-title">Institutional intelligence is gated</div>
                <div className="ld-pulse-gate-sub">Enter the ecosystem to view active off-market assets</div>
              </button>
            </div>

            {/* Right rail: live counter + ticker */}
            <div className="ld-pulse-rail">
              <div className="ld-pulse-counter">
                <div className="ld-pulse-counter-val">847</div>
                <div className="ld-pulse-counter-lbl">Off-market signals surfaced<br/>across AB &amp; BC this week</div>
              </div>

              <div className="ld-pulse-ticker">
                <div className="ld-pulse-ticker-head">
                  <span className="ld-pulse-ticker-dot" />
                  LIVE FEED · 14:23 MDT
                </div>
                <div className="ld-pulse-ticker-rows">
                  <div className="ld-pulse-ticker-row">
                    <span className="ld-pulse-ticker-time">14:21</span>
                    <span className="ld-pulse-ticker-msg"><strong>3 multifamily assets</strong> identified in Calgary this week</span>
                  </div>
                  <div className="ld-pulse-ticker-row">
                    <span className="ld-pulse-ticker-time">14:18</span>
                    <span className="ld-pulse-ticker-msg"><strong>Zoning shift</strong> detected · Vancouver Mt. Pleasant</span>
                  </div>
                  <div className="ld-pulse-ticker-row">
                    <span className="ld-pulse-ticker-time">14:14</span>
                    <span className="ld-pulse-ticker-msg"><strong>1 hotel asset</strong> flagged off-market · Edmonton</span>
                  </div>
                  <div className="ld-pulse-ticker-row">
                    <span className="ld-pulse-ticker-time">14:08</span>
                    <span className="ld-pulse-ticker-msg"><strong>Title transfer</strong> · 38-unit walk-up · Kelowna</span>
                  </div>
                  <div className="ld-pulse-ticker-row">
                    <span className="ld-pulse-ticker-time">13:55</span>
                    <span className="ld-pulse-ticker-msg"><strong>Cap-rate decay</strong> alert · Victoria multifamily</span>
                  </div>
                </div>
              </div>

              <button className="ld-pulse-cta" onClick={scrollToAuth}>
                Enter the Ecosystem →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <div className="ld-cta fade">
        <h2>The room you've been<br />trying to walk into <span>opens here.</span></h2>
        <p>By invitation. No credit card. The next deal you analyze will be the first one you actually understand.</p>
        <button className="ld-cta-btn" onClick={scrollToAuth}>Enter the Ecosystem →</button>
        <div className="ld-cta-trust">
          {["✓ Free during launch", "✓ No credit card", "✓ US & Canada markets", "✓ 20 tools, one platform"].map(item => (
            <div key={item} className="ld-cta-trust-item">{item}</div>
          ))}
        </div>
      </div>

      {/* ── FOOTER — Family Office: minimalist, manifesto, By Invitation Only ── */}
      <footer className="ld-foot">
        <div className="ld-foot-inner">
          <div className="ld-foot-logo">Rize<span>AI</span></div>
          <div className="ld-foot-manifesto">
            RizeAI is the hidden door to high-level real estate. We merge advanced
            intelligence with operational peace — for those who treat capital as
            literacy, not luck.
          </div>
          <div className="ld-foot-rule" />
          <div className="ld-foot-links">
            <span onClick={() => navigate('/pricing')}>Access</span>
            <span onClick={scrollToAuth}>Application</span>
            <span onClick={() => navigate('/privacy')}>Privacy</span>
            <span onClick={() => navigate('/terms')}>Terms</span>
          </div>
          <div className="ld-foot-note">© 2026 RizeAI · By Invitation Only · North America</div>
        </div>
      </footer>
    </div>
  );
}
