import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";
import LeadForm from "./components/LeadForm";
import { saveXrayPrefill } from "./lib/xrayPrefill";
import { track } from "./lib/analytics";

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

// ── TESTIMONIALS ────────────────────────────────────────────────────────
// Empty by default — the section renders an honest "Early access · be among
// the first to share your results" placeholder when this array is empty,
// and a 2/3-up testimonial grid when it has entries.
//
// To add a real testimonial, push an object with this shape:
//   {
//     name:    "Sarah Chen",                                // Full name (or "First L.")
//     role:    "Multifamily Operator",                      // Their title
//     company: "Optional · Brokerage / fund name",          // Optional company
//     city:    "Calgary, AB",                               // City + province
//     deals:   12,                                          // Optional deal count
//     quote:   "Pulled $187K of stranded upside on a deal …", // Their actual words
//     metric:  { value: "$187K", label: "stranded upside" }, // Optional headline result
//     avatar:  "S",                                         // Initial for the avatar pill
//     color:   "var(--brass)",                              // var(--brass)|var(--royal)|var(--green)
//     verified: true,                                       // Whether they've consented + signed off
//   }
//
// NOTE: never invent testimonials. If you don't have real consent + a real
// quote in writing, leave this array empty and let the placeholder render.
const TESTIMONIALS = [];

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
  const [faqOpen, setFaqOpen] = useState(new Set([0])); // First FAQ open by default

  // ── X-RAY UNDERWRITING BAR (landing-page "aha moment") ──
  // 'idle' → 'scanning' → 'revealed' | 'error'. Reveal shows three free
  // data points from /api/property-lookup (yearBuilt, assessedValue, zoning)
  // plus three blurred "Rize Proprietary Insights" gated behind the auth CTA.
  const [xrayAddress, setXrayAddress] = useState("");
  const [xrayState, setXrayState] = useState("idle");
  const [xrayPhase, setXrayPhase] = useState(0);
  const [xrayData, setXrayData] = useState(null);
  const [xrayGrade, setXrayGrade] = useState(null);
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

  const runXray = async (overrideAddr) => {
    if (xrayState === "scanning") return;
    // Preset clicks pass the address directly so we don't fight React's
    // batched state updates. Manual input falls back to xrayAddress.
    const addr = (typeof overrideAddr === "string" ? overrideAddr : xrayAddress).trim();
    if (!addr) {
      setXrayError("Enter an address to begin.");
      setXrayState("error");
      return;
    }
    setXrayError("");
    setXrayData(null);
    setXrayGrade(null);
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

    // Hard timeout — kills the scan if the network/API hangs. Previously
    // the spinner could spin forever on a slow AI or down API.
    const timeoutId = setTimeout(() => {
      clearInterval(tick);
      if (xrayState !== "revealed") {
        setXrayError("Scan timed out — try another address or refresh.");
        setXrayState("error");
      }
    }, 14000);

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
      clearTimeout(timeoutId);

      setXrayData({
        address:             payload.address || addr,
        yearBuilt:           payload.yearBuilt,
        yearBuiltSource:     payload.yearBuiltSource,
        yearBuiltConfidence: payload.yearBuiltConfidence,
        yearBuiltReasoning:  payload.yearBuiltReasoning,
        assessedValue:       payload.assessedValue,
        propertyTaxes:       payload.propertyTaxes,
        squareFootage:       payload.squareFootage,
        zoningCode:          payload.zoning?.code,
        zoningDesc:          payload.zoning?.description,
        country:             payload.country,
        source:              payload.source,
        scanMs:              Math.max(elapsed, minScanMs),
        zoning:              payload.zoning,
        cmhc:                payload.cmhc,
      });
      setXrayState("revealed");

      // Persist the scan so every calculator can read it on mount and
      // pre-fill the address + property fields. 30-min TTL inside the helper.
      saveXrayPrefill({
        address:       payload.address || addr,
        yearBuilt:     payload.yearBuilt,
        assessedValue: payload.assessedValue,
        zoning:        payload.zoning,
        cmhc:          payload.cmhc,
        rentEstimate:  payload.rentEstimate,
        country:       payload.country,
        source:        payload.source,
      });

      // Fire the building-grade call after the reveal so the public-record
      // cells appear immediately. Grade lands ~1-2s later and slots in.
      fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "building-grade",
          address: payload.address || addr,
          zoning: payload.zoning,
          assessment: {
            yearBuilt:    payload.yearBuilt,
            assessedValue: payload.assessedValue,
            lotSizeSqM:   payload.lotSize ? (payload.lotSize / 10.7639) : null,
          },
          cmhc: payload.cmhc,
        }),
      })
        .then(r => r.json())
        .then(g => {
          if (g?.ok) setXrayGrade(g);
        })
        .catch(() => {/* grade is optional — silent failure */});
    } catch (err) {
      clearInterval(tick);
      clearTimeout(timeoutId);
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
    /* ── INVESTOR-MODE NOISE FILTER ──
       Six sections were template-y / manifesto-y / redundant for the
       first-impression flow. Hidden via CSS instead of deleted so they're
       still in the code if the user wants to revive them later.
       Remove this block (or comment out individual selectors) to restore. */
    .ld-ritual,
    .ld-ethos,
    .ld-why,
    .ld-auth-section,
    .ld-chrome,
    .ld-pulse,
    .deals-outer,
    .ld-preview {
      display: none !important;
    }

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
    .ld-hero{min-height:calc(100svh - 52px);display:flex;align-items:stretch;justify-content:center;padding:0;position:relative;overflow:hidden;background:#0f172a}
    .ld-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(0,102,204,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,102,204,0.06) 1px,transparent 1px);background-size:56px 56px;pointer-events:none;z-index:2}
    /* ── Full-bleed video as cover — letterbox treatment ──
       Video plays SHARP and unblurred (it IS the proof — that's the
       actual product walkthrough). Gradients at the top + bottom create
       framed zones where the H1 and the activity feed sit. The middle
       of the viewport stays clean — video plays unobscured. */
    .ld-hero-bgvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:1}
    /* Top frame: deep navy ~70-90% fades down → transparent mid-frame */
    /* Dark strips ONLY at top (text band) + bottom (activity/stats band).
       Middle 30-70% is nearly transparent so the demo video is fully visible
       as the visual centerpiece of the hero. */
    .ld-hero-bgvid-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,17,40,0.92) 0%,rgba(10,17,40,0.75) 18%,rgba(10,17,40,0.20) 30%,rgba(10,17,40,0.10) 50%,rgba(10,17,40,0.22) 70%,rgba(10,17,40,0.82) 85%,rgba(10,17,40,0.98) 100%);z-index:1;pointer-events:none}
    /* Brand bokeh — royal blue glow at center-top, brushed brass at lower-right */
    .ld-hero-bgvid-tint{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 8%,rgba(33,85,205,0.28) 0%,transparent 38%),radial-gradient(ellipse at 90% 95%,rgba(212,175,55,0.14) 0%,transparent 42%);z-index:1;pointer-events:none}
    .ld-glow{position:absolute;top:20%;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(33,85,205,0.14) 0%,transparent 65%);pointer-events:none;animation:breathe 5s ease-in-out infinite}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:0.55}}
    .ld-hero-inner{max-width:1320px;width:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:center;gap:28px;position:relative;z-index:3;padding:48px 24px 40px;box-sizing:border-box}
    /* Compact top header band — sits above the video, not blocking it. */
    .ld-hero-head{text-align:center;max-width:920px;margin:0 auto;position:relative}
    /* Localized dark vignette behind the headline so the text reads cleanly
       over the background video's brightest middle band. Keeps the rest of
       the video atmospheric — only darkens the zone behind the text. */
    .ld-hero-head::before{content:'';position:absolute;inset:-60px -120px -40px -120px;background:radial-gradient(ellipse at 50% 45%,rgba(10,17,40,0.78) 0%,rgba(10,17,40,0.45) 45%,transparent 80%);z-index:-1;pointer-events:none}
    @media(max-width:720px){
      .ld-hero-head::before{inset:-40px -40px -20px -40px}
    }
    .ld-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--brass);margin-bottom:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(10,17,40,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px}
    .ld-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;flex-shrink:0;box-shadow:0 0 10px var(--brass)}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    /* Compact top header band — sits above the video, not blocking it. */
    .ld-h1{font-size:clamp(26px,4vw,54px);font-weight:800;line-height:1.1;letter-spacing:-1.4px;color:var(--alabaster);margin-bottom:12px;text-shadow:0 4px 20px rgba(0,0,0,0.85),0 1px 0 rgba(0,0,0,0.5)}
    .ld-h1 span{color:var(--brass);text-shadow:0 4px 22px rgba(212,175,55,0.35),0 4px 18px rgba(0,0,0,0.8);font-style:italic;font-weight:700}
    .ld-hero-p{font-size:clamp(14px,1.5vw,18px);color:var(--alabaster-2);line-height:1.55;margin:0 auto;max-width:820px;text-shadow:0 2px 14px rgba(0,0,0,0.7)}
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
    .ld-section-tag{display:inline-block;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--brass);margin-bottom:18px;text-align:center;background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.32);padding:6px 12px;border-radius:4px}
    .ld-section-tag::before{content:"▸ "}
    .ld-section-title{font-size:clamp(30px,4vw,46px);font-weight:800;letter-spacing:-1.4px;color:var(--alabaster);margin-bottom:16px;text-align:center;line-height:1.08}
    .ld-section-title span{color:var(--brass);font-style:italic;font-weight:700}
    .ld-section-sub{font-size:16.5px;color:var(--alabaster-2);text-align:center;max-width:620px;margin:0 auto 52px;line-height:1.7}

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
    .ld-anatomy{padding:96px 24px;border-top:1px solid rgba(212,175,55,0.08);background:linear-gradient(180deg,#0a1128 0%,#0c1530 50%,#0a1128 100%);position:relative}
    .ld-anatomy::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;height:400px;background:radial-gradient(ellipse,rgba(33,85,205,0.06) 0%,transparent 65%);pointer-events:none}
    .ld-anatomy-inner{max-width:1140px;margin:0 auto}
    .ld-anatomy-head{text-align:center;margin-bottom:48px}
    .ld-anatomy-deal-bar{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;background:var(--card);border:1px solid var(--borderf);border-left:3px solid var(--blue);border-radius:4px;margin-top:18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--text);letter-spacing:0.5px;font-weight:600}
    .ld-anatomy-steps{display:flex;flex-direction:column;gap:32px}
    .ld-anatomy-step{display:grid;grid-template-columns:300px 1fr;gap:36px;align-items:start}
    .ld-anatomy-left{padding-top:8px}
    .ld-anatomy-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;font-weight:700;color:var(--blue);letter-spacing:2px;margin-bottom:10px}
    .ld-anatomy-title{font-family:'Geist',sans-serif;font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.8px;line-height:1.2;margin-bottom:10px}
    .ld-anatomy-desc{font-size:13.5px;color:var(--sub);line-height:1.7}
    .ld-anatomy-right{background:rgba(0,12,31,0.78);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.22);border-radius:6px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(212,175,55,0.04) inset;position:relative;z-index:1}
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
    .ld-pro{padding:96px 24px;border-top:1px solid rgba(212,175,55,0.08);background:linear-gradient(180deg,#070b1a 0%,#0a1128 100%);position:relative}
    .ld-pro::before{content:'';position:absolute;top:25%;right:5%;width:500px;height:400px;background:radial-gradient(ellipse,rgba(212,175,55,0.06) 0%,transparent 65%);pointer-events:none}
    .ld-pro-inner{max-width:1140px;margin:0 auto}
    .ld-pro-head{text-align:center;margin-bottom:44px}
    .ld-pro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .ld-pro-card{background:rgba(0,12,31,0.65);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.22);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s, border-color 0.2s, box-shadow 0.15s;cursor:pointer;position:relative;z-index:1}
    .ld-pro-card:hover{border-color:rgba(212,175,55,0.5);transform:translateY(-2px);box-shadow:0 24px 60px rgba(212,175,55,0.12)}
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
    .ld-xray{padding:96px 24px;position:relative;background:linear-gradient(180deg,#070b1a 0%,#0a1128 50%,#070b1a 100%);border-top:1px solid rgba(212,175,55,0.08);border-bottom:1px solid rgba(212,175,55,0.08)}
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

    /* Preset chips — verified-working addresses below the X-Ray input.
       Click → auto-fill + auto-run. Live-demo insurance. */
    .ld-xray-presets{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 18px;background:rgba(0,0,0,0.18);border-bottom:1px solid rgba(255,255,255,0.05)}
    .ld-xray-presets-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.3px;color:var(--alabaster-3);text-transform:uppercase;margin-right:4px}
    .ld-xray-preset{background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.28);color:var(--alabaster-2);font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:0.4px;padding:6px 11px;border-radius:3px;cursor:pointer;transition:all 0.15s}
    .ld-xray-preset:hover{background:rgba(212,175,55,0.14);border-color:var(--brass);color:var(--brass);transform:translateY(-1px)}
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

    .ld-xray-section-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--alabaster-3);text-transform:uppercase;margin:20px 0 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .ld-xray-section-lbl.restricted{color:var(--brass);display:flex;align-items:center;gap:6px}
    .ld-xray-grade-overall{margin-left:auto;font-size:11px;font-weight:800;color:var(--brass);letter-spacing:1.2px;border:1px solid var(--brass);padding:3px 9px;border-radius:3px;background:rgba(212,175,55,0.06)}

    /* Building grade card — 4 dimensions */
    .ld-xray-gradegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
    .ld-xray-gradecell{display:flex;align-items:flex-start;gap:12px;background:rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.18);border-left:2px solid var(--brass);border-radius:4px;padding:12px 14px}
    .ld-xray-gradecell-grade{font-family:'Geist',sans-serif;font-size:24px;font-weight:800;color:var(--brass);letter-spacing:-1px;line-height:1;width:42px;height:42px;border:1.5px solid var(--brass);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(212,175,55,0.06)}
    .ld-xray-gradecell-body{flex:1;min-width:0}
    .ld-xray-gradecell-name{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:0.8px;color:var(--alabaster-2);text-transform:uppercase;margin-bottom:5px}
    .ld-xray-gradecell-note{font-family:'Geist',sans-serif;font-size:12px;color:var(--alabaster-2);line-height:1.45}
    .ld-xray-gradesummary{grid-column:1 / -1;margin-top:4px;padding:12px 14px;background:rgba(33,85,205,0.08);border:1px solid rgba(33,85,205,0.25);border-left:2px solid var(--royal);border-radius:4px;font-family:'Geist',sans-serif;font-size:12.5px;color:var(--alabaster);line-height:1.5;font-style:italic}
    .ld-xray-gradeloading{display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(212,175,55,0.04);border:1px dashed rgba(212,175,55,0.3);border-radius:4px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:var(--brass);letter-spacing:0.4px}
    .ld-xray-gradeloading-dot{width:7px;height:7px;border-radius:50%;background:var(--brass);box-shadow:0 0 10px var(--brass);animation:blink 1.2s infinite}

    @media(max-width:720px){
      .ld-xray-gradegrid{grid-template-columns:1fr}
    }

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
    .ld-translator{padding:96px 24px;position:relative;background:linear-gradient(180deg,#0a1128 0%,#0c1530 50%,#0a1128 100%);border-top:1px solid rgba(212,175,55,0.08)}
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
    .ld-foot{background:#000c1f;border-top:1px solid rgba(212,175,55,0.18);padding:56px 0 32px;position:relative}
    .ld-foot::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,var(--brass) 50%,transparent 100%);opacity:0.4}
    .ld-foot-grid{max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr 1fr;gap:36px;margin-bottom:32px}
    .ld-foot-col{display:flex;flex-direction:column;gap:10px}
    .ld-foot-brand{gap:14px;padding-right:24px}
    .ld-foot-logo{font-size:22px;font-weight:800;letter-spacing:-0.4px;color:var(--brass);font-family:'Geist',sans-serif}
    .ld-foot-logo span{color:var(--alabaster)}
    .ld-foot-tag{font-size:14px;color:var(--alabaster-2);line-height:1.65}
    .ld-foot-stats{display:flex;flex-direction:column;gap:6px;margin-top:6px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:var(--alabaster-3);letter-spacing:0.2px}
    .ld-foot-stats strong{color:var(--brass);font-weight:700;margin-right:4px}
    .ld-foot-col-head{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--brass);text-transform:uppercase;margin-bottom:6px}
    .ld-foot-col span,.ld-foot-link{font-family:'Geist',sans-serif;font-size:13.5px;color:var(--alabaster-2);cursor:pointer;letter-spacing:0;text-decoration:none;transition:color 0.15s;display:inline-block}
    .ld-foot-col span:hover,.ld-foot-link:hover{color:var(--brass)}
    .ld-foot-rule-line{max-width:1120px;margin:0 auto;height:1px;background:rgba(212,175,55,0.15)}
    .ld-foot-bottom{max-width:1120px;margin:0 auto;padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
    .ld-foot-copyright{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);letter-spacing:0.6px;text-transform:uppercase}
    .ld-foot-status{display:flex;align-items:center;gap:7px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:var(--alabaster-3);letter-spacing:0.6px;text-transform:uppercase}
    .ld-foot-status-dot{width:7px;height:7px;border-radius:50%;background:#2dd47f;box-shadow:0 0 8px #2dd47f;animation:blink 2s infinite}
    @media (max-width:1100px){
      .ld-foot-grid{grid-template-columns:1.5fr 1fr 1fr 1fr;gap:28px}
      .ld-foot-brand{grid-column:1 / -1;padding-right:0}
    }
    @media (max-width:720px){
      .ld-foot-grid{grid-template-columns:1fr 1fr;gap:28px;padding:0 18px}
      .ld-foot-brand{grid-column:1 / -1;padding-right:0}
      .ld-foot-bottom{flex-direction:column;align-items:flex-start;gap:8px}
    }

    .ld-cta{text-align:center;padding:120px 24px;border-top:1px solid rgba(212,175,55,0.08);position:relative;overflow:hidden;background:linear-gradient(180deg,#0a1128 0%,#070b1a 100%)}
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
      .ld-hero-inner{gap:24px;padding:36px 20px 32px}
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

    /* ── UNIVERSAL MOBILE FIXES — tightens sections that were over-spaced
       or overflowing on phones. Audited section by section.                */
    @media(max-width:560px){
      /* Hero: pull headline closer, scale CTA buttons properly. */
      .ld-hero{padding-top:0;min-height:auto}
      .ld-hero-inner{padding:32px 16px 32px;gap:20px;min-height:auto}
      .ld-hero-p{font-size:14px;line-height:1.55}
      .ld-eyebrow{font-size:10px;padding:5px 10px;margin-bottom:12px}
      .ld-h1{font-size:26px;letter-spacing:-1px;line-height:1.15;margin-bottom:8px}
      .ld-hero-head{max-width:100%}
      .ld-stats{gap:16px}
      .ld-stat-val{font-size:20px}
      .ld-hero-foot{gap:12px}

      /* Activity feed row: drop the 70px ROI column so the address has room. */
      .ld-activity-row{grid-template-columns:46px 1fr 56px;gap:8px;padding:7px 12px;font-size:11px}
      .ld-activity-row .ld-ar-roi{display:none}
      .ld-activity-head{padding:7px 12px;font-size:9.5px}

      /* Hero stats: tighten gap + scale numbers. */
      .ld-stats{gap:14px;justify-content:space-between;width:100%}
      .ld-stat-val{font-size:18px}
      .ld-stat-lbl{font-size:10.5px}

      /* Trust pills: shrink padding + font so a 360px viewport fits 2-3 per row. */
      .ld-trust-pill{font-size:11px;padding:5px 9px}
      .ld-hero-trust{gap:8px}

      /* CTA: 120px padding is too generous on mobile. */
      .ld-cta{padding:64px 18px}
      .ld-cta h2{font-size:26px;letter-spacing:-1px}
      .ld-cta p{font-size:14.5px;padding:0 8px}
      .ld-cta-btn{padding:14px 28px;font-size:15px;width:100%;max-width:340px}
      .ld-cta-trust{gap:8px;font-size:12px}

      /* Proof + FAQ sections already have their own 560px rules — no-op here.   */
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
              RIZEAI · CANADIAN UNDERWRITER
            </div>
            <h1 className="ld-h1">Underwrite any Canadian listing <span>in 3 seconds.</span></h1>
            <p className="ld-hero-p">BRRRR, Hold, Flip, Multiplex — four strategies, one address, institutional math. Built for <strong style={{color:"var(--brass)"}}>brokers, agents, and investors</strong> in 7 CA cities.</p>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:14,fontSize:11.5,fontFamily:"'Geist Mono',monospace",color:"var(--alabaster-2)"}}>
              <a href="/investors" onClick={(e) => { e.preventDefault(); navigate("/investors"); }} style={{color:"var(--brass)",textDecoration:"none",padding:"5px 11px",border:"1px solid rgba(212,175,55,0.28)",borderRadius:4,letterSpacing:0.4,fontWeight:700}}>▸ For investors</a>
              <a href="/pitch" onClick={(e) => { e.preventDefault(); navigate("/pitch"); }} style={{color:"var(--alabaster-2)",textDecoration:"none",padding:"5px 11px",border:"1px solid rgba(255,255,255,0.14)",borderRadius:4,letterSpacing:0.4,fontWeight:700}}>🔒 For VCs</a>
              <a href="/angel" onClick={(e) => { e.preventDefault(); navigate("/angel"); }} style={{color:"var(--alabaster-2)",textDecoration:"none",padding:"5px 11px",border:"1px solid rgba(255,255,255,0.14)",borderRadius:4,letterSpacing:0.4,fontWeight:700}}>💰 Angel round</a>
            </div>
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

      {/* ── ACTIVE CITIES TRUST STRIP — social proof scaffold ──
          Shows which Canadian cities RizeAI has live coverage in. Grows into
          named firm logos when broker firms sign up. Sits between hero and
          the live stats band as the credibility ladder. */}
      <section className="ld-trustcities">
        <style>{`
          .ld-trustcities{background:#0d1428;border-top:1px solid rgba(212,175,55,0.08);padding:18px 24px}
          .ld-trustcities-inner{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap}
          .ld-trustcities-label{font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);white-space:nowrap;padding-right:14px;border-right:1px solid rgba(212,175,55,0.20)}
          .ld-trustcity{display:inline-flex;align-items:center;gap:6px;font-family:'Geist Mono',monospace;font-size:11px;font-weight:600;color:var(--alabaster-2);opacity:0.9;letter-spacing:0.4px}
          .ld-trustcity-dot{width:5px;height:5px;border-radius:50%;background:#16a34a;box-shadow:0 0 4px #16a34a}
          @media(max-width:720px){.ld-trustcities-inner{gap:14px}.ld-trustcities-label{padding-right:10px;font-size:9px}.ld-trustcity{font-size:10px}}
        `}</style>
        <div className="ld-trustcities-inner">
          <div className="ld-trustcities-label">▸ Active in</div>
          {[
            "Calgary, AB", "Edmonton, AB", "Vancouver, BC",
            "Toronto, ON", "Ottawa, ON", "Mississauga, ON", "Hamilton, ON",
          ].map(c => (
            <span key={c} className="ld-trustcity">
              <span className="ld-trustcity-dot" /> {c}
            </span>
          ))}
        </div>
      </section>

      {/* ── PRODUCT MOCKUP TEASER — visual 4-strategy verdict grid ──
          VCs skim. This shows the actual product output so they see
          "this is a real product" before reading more copy. Interactive
          hover CTA sends them to the auto-firing demo at /property. */}
      <section className="ld-mock">
        <style>{`
          .ld-mock{padding:72px 24px 40px;background:linear-gradient(180deg,#0f172a 0%,#0d1428 50%,#0f172a 100%);border-top:1px solid rgba(212,175,55,0.08);border-bottom:1px solid rgba(212,175,55,0.08)}
          .ld-mock-inner{max-width:1180px;margin:0 auto}
          .ld-mock-head{text-align:center;margin-bottom:32px}
          .ld-mock-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.30);padding:6px 14px;border-radius:4px;margin-bottom:14px}
          .ld-mock-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
          .ld-mock-h2{font-size:clamp(26px,4vw,40px);font-weight:800;color:var(--alabaster);letter-spacing:-1.3px;line-height:1.1;margin:0 0 12px}
          .ld-mock-h2 span{color:var(--brass);font-style:italic;font-weight:700}
          .ld-mock-sub{font-size:14.5px;color:var(--alabaster-2);line-height:1.6;max-width:580px;margin:0 auto}

          /* Terminal card */
          .ld-mock-terminal{background:rgba(15,23,42,0.85);border:1px solid rgba(212,175,55,0.28);border-radius:12px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.6),0 0 0 1px rgba(212,175,55,0.05);backdrop-filter:blur(20px)}
          .ld-mock-topbar{display:flex;align-items:center;gap:10px;padding:12px 18px;background:rgba(10,17,40,0.6);border-bottom:1px solid rgba(212,175,55,0.15);font-family:'Geist Mono',monospace}
          .ld-mock-dots{display:flex;gap:5px}
          .ld-mock-dot{width:8px;height:8px;border-radius:50%}
          .ld-mock-dot.r{background:#ff5f56}
          .ld-mock-dot.y{background:#ffbd2e}
          .ld-mock-dot.g{background:#27c93f}
          .ld-mock-addr{flex:1;font-size:12px;font-weight:700;color:var(--alabaster);letter-spacing:0.2px}
          .ld-mock-live-tag{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#16a34a;padding:3px 8px;background:rgba(22,163,74,0.10);border:1px solid rgba(22,163,74,0.30);border-radius:3px}
          .ld-mock-live-tag-dot{width:6px;height:6px;border-radius:50%;background:#16a34a;box-shadow:0 0 6px #16a34a;animation:blink 1.4s infinite}

          .ld-mock-body{padding:26px 24px 22px}
          .ld-mock-summary{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:20px;border-bottom:1px dashed rgba(212,175,55,0.20);margin-bottom:22px;flex-wrap:wrap}
          .ld-mock-summary-left{flex:1;min-width:240px}
          .ld-mock-address-line{font-size:16px;font-weight:800;color:var(--alabaster);letter-spacing:-0.3px;margin-bottom:4px}
          .ld-mock-address-sub{font-family:'Geist Mono',monospace;font-size:11.5px;font-weight:600;color:var(--alabaster-2);letter-spacing:0.3px}
          .ld-mock-address-sub .ld-mock-brass{color:var(--brass)}
          .ld-mock-time{text-align:right}
          .ld-mock-time-val{font-family:'Geist Mono',monospace;font-size:28px;font-weight:800;color:var(--brass);letter-spacing:-1px;line-height:1}
          .ld-mock-time-lbl{font-family:'Geist Mono',monospace;font-size:10px;font-weight:700;color:var(--alabaster-2);letter-spacing:1px;margin-top:4px;text-transform:uppercase}

          /* 4-strategy grid */
          .ld-mock-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
          @media(max-width:720px){.ld-mock-grid{grid-template-columns:repeat(2,1fr)}}
          @media(max-width:420px){.ld-mock-grid{grid-template-columns:1fr}}
          .ld-mock-strat{padding:16px 14px;background:rgba(0,12,31,0.55);border:1px solid rgba(212,175,55,0.14);border-radius:8px;border-left-width:3px;border-left-style:solid}
          .ld-mock-strat.go{border-left-color:#22c55e}
          .ld-mock-strat.strong{border-left-color:#16a34a}
          .ld-mock-strat.caution{border-left-color:#eab308}
          .ld-mock-strat.pass{border-left-color:#dc2626}
          .ld-mock-strat-name{font-family:'Geist Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--alabaster-2);text-transform:uppercase;margin-bottom:8px}
          .ld-mock-strat-verdict{display:inline-block;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:800;letter-spacing:1px;padding:3px 7px;border-radius:3px;margin-bottom:12px;border:1px solid currentColor}
          .ld-mock-strat-verdict.go{color:#22c55e;background:rgba(34,197,94,0.10)}
          .ld-mock-strat-verdict.strong{color:#16a34a;background:rgba(22,163,74,0.10)}
          .ld-mock-strat-verdict.caution{color:#eab308;background:rgba(234,179,8,0.10)}
          .ld-mock-strat-verdict.pass{color:#dc2626;background:rgba(220,38,38,0.10)}
          .ld-mock-strat-headline{font-family:'Geist Mono',monospace;font-size:18px;font-weight:800;color:var(--alabaster);letter-spacing:-0.4px;line-height:1;margin-bottom:6px}
          .ld-mock-strat-sub{font-family:'Geist Mono',monospace;font-size:11px;font-weight:600;color:var(--alabaster-2);letter-spacing:0.2px;line-height:1.4}

          /* Sources strip */
          .ld-mock-sources{padding:12px 14px;background:rgba(0,12,31,0.35);border:1px solid rgba(212,175,55,0.14);border-radius:6px;font-family:'Geist Mono',monospace;font-size:10.5px;color:var(--alabaster-2);letter-spacing:0.3px;line-height:1.5;text-align:center}
          .ld-mock-sources b{color:var(--brass)}

          /* CTA */
          .ld-mock-cta-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:22px}
          .ld-mock-cta{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:var(--brass);color:#0a1128;border:1px solid var(--brass);border-radius:6px;font-family:'Geist Mono',monospace;font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;cursor:pointer;text-decoration:none;transition:transform 0.15s}
          .ld-mock-cta:hover{transform:translateY(-1px);box-shadow:0 12px 30px rgba(212,175,55,0.35)}
          .ld-mock-cta.ghost{background:transparent;color:var(--alabaster);border-color:rgba(255,255,255,0.20)}
        `}</style>
        <div className="ld-mock-inner">
          <div className="ld-mock-head">
            <div className="ld-mock-eyebrow">
              <span className="ld-mock-eyebrow-dot" />
              ▸ THE PRODUCT · SAMPLE VERDICT
            </div>
            <h2 className="ld-mock-h2">One address in. <span>Four verdicts out.</span></h2>
            <p className="ld-mock-sub">This is what a Calgary R-CG property returns from RizeAI. Real bylaw specs, real CMHC rent anchors, real IRR math. Three seconds.</p>
          </div>

          <div className="ld-mock-terminal">
            <div className="ld-mock-topbar">
              <div className="ld-mock-dots">
                <div className="ld-mock-dot r" />
                <div className="ld-mock-dot y" />
                <div className="ld-mock-dot g" />
              </div>
              <div className="ld-mock-addr">▸ realdealestate.app/property</div>
              <div className="ld-mock-live-tag">
                <span className="ld-mock-live-tag-dot" />
                LIVE VERDICT
              </div>
            </div>

            <div className="ld-mock-body">
              <div className="ld-mock-summary">
                <div className="ld-mock-summary-left">
                  <div className="ld-mock-address-line">2424 Westmount Rd NW, Calgary AB</div>
                  <div className="ld-mock-address-sub">
                    Listed <span className="ld-mock-brass">$607,000</span> · 5,500 sqft lot · Zoning <span className="ld-mock-brass">R-CG</span> · CMHC anchor <span className="ld-mock-brass">$2,200/door</span>
                  </div>
                </div>
                <div className="ld-mock-time">
                  <div className="ld-mock-time-val">2.9s</div>
                  <div className="ld-mock-time-lbl">verdict</div>
                </div>
              </div>

              <div className="ld-mock-grid">
                <div className="ld-mock-strat strong">
                  <div className="ld-mock-strat-name">BRRRR</div>
                  <div className="ld-mock-strat-verdict strong">STRONG</div>
                  <div className="ld-mock-strat-headline">∞ CoC</div>
                  <div className="ld-mock-strat-sub">$0K left in · $243K 5yr equity</div>
                </div>
                <div className="ld-mock-strat go">
                  <div className="ld-mock-strat-name">Buy &amp; Hold</div>
                  <div className="ld-mock-strat-verdict go">GO</div>
                  <div className="ld-mock-strat-headline">5.8% CoC</div>
                  <div className="ld-mock-strat-sub">$187/mo cashflow</div>
                </div>
                <div className="ld-mock-strat caution">
                  <div className="ld-mock-strat-name">Fix &amp; Flip</div>
                  <div className="ld-mock-strat-verdict caution">CAUTION</div>
                  <div className="ld-mock-strat-headline">+$32K</div>
                  <div className="ld-mock-strat-sub">12% ROI · 22% annualized</div>
                </div>
                <div className="ld-mock-strat strong">
                  <div className="ld-mock-strat-name">4-plex build</div>
                  <div className="ld-mock-strat-verdict strong">STRONG</div>
                  <div className="ld-mock-strat-headline">22% IRR</div>
                  <div className="ld-mock-strat-sub">$1.05M ARV · $2,200/door</div>
                </div>
              </div>

              <div className="ld-mock-sources">
                Sources: <b>Calgary Land Use Bylaw 1P2007</b> · <b>CMHC Calgary Rental Report Q4 2025</b> · <b>City of Calgary Open Data (parcels + permits)</b>
              </div>

              <div className="ld-mock-cta-row">
                <a
                  href="/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB"
                  className="ld-mock-cta"
                  onClick={(e) => { e.preventDefault(); try { track("landing_mock_demo_click"); } catch {} window.location.href = "/property?addr=" + encodeURIComponent("2424 Westmount Rd NW, Calgary AB"); }}
                >
                  ▶ Run this verdict live — no signup
                </a>
                <button className="ld-mock-cta ghost" onClick={() => navigate("/case-studies/calgary-rcg-fourplex")}>See the full case study →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE TAM SLIDER — visitors slide broker adoption %
          and see the market sizing math live. Way more credible than a
          static $600B claim — invites the visitor to disagree with the
          math and reach the same conclusion. */}
      <TamSlider />

      {/* ── LIVE STATS BAND — real numbers + demo CTA (raise-prep) ──
          Pulls counts from /api/metrics client-side. Top-of-fold VC/broker
          credibility strip: "37 zoning codes · N property lookups served ·
          7 CA cities." Big green "▶ Try live demo" button routes to
          /property with a pre-filled Calgary address. */}
      <LandingStatsBand />

      {/* ── DATA-SOURCE STRIP — "Powered by" credibility band ──
          Immediately under the hero. Names the 6 data providers institutions
          respect: CMHC (rent), Calgary + Edmonton Open Data (zoning + parcels),
          Anthropic (AI thesis), Nominatim (geocoding), RentCast (US
          fallback). Answers the "who's your data provider?" broker question
          before they have to ask. */}
      <section className="ld-datastrip">
        <style>{`
          .ld-datastrip{background:#070b18;border-top:1px solid rgba(212,175,55,0.10);border-bottom:1px solid rgba(212,175,55,0.10);padding:22px 24px}
          .ld-datastrip-inner{max-width:1320px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
          .ld-datastrip-label{font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);white-space:nowrap;padding-right:14px;border-right:1px solid rgba(212,175,55,0.20)}
          .ld-datastrip-item{font-family:'Geist Mono',monospace;font-size:11.5px;font-weight:600;letter-spacing:0.4px;color:var(--alabaster-2);opacity:0.88;transition:color 0.15s,opacity 0.15s;cursor:default}
          .ld-datastrip-item:hover{color:var(--brass);opacity:1}
          .ld-datastrip-sep{color:rgba(212,175,55,0.30);font-size:10px}
          @media(max-width:720px){
            .ld-datastrip{padding:16px 16px}
            .ld-datastrip-inner{gap:14px}
            .ld-datastrip-label{padding-right:8px;font-size:9px;letter-spacing:1.2px}
            .ld-datastrip-item{font-size:10.5px}
            .ld-datastrip-sep{display:none}
          }
        `}</style>
        <div className="ld-datastrip-inner">
          <div className="ld-datastrip-label">▸ Data Providers</div>
          <span className="ld-datastrip-item" title="Canada Mortgage & Housing Corporation — market rent anchors">CMHC</span>
          <span className="ld-datastrip-sep">·</span>
          <span className="ld-datastrip-item" title="City of Calgary Open Data — parcels, zoning, permits, assessment">Calgary Open Data</span>
          <span className="ld-datastrip-sep">·</span>
          <span className="ld-datastrip-item" title="City of Edmonton Open Data — parcels, zoning, permits, assessment">Edmonton Open Data</span>
          <span className="ld-datastrip-sep">·</span>
          <span className="ld-datastrip-item" title="our AI for AI thesis generation">Anthropic</span>
          <span className="ld-datastrip-sep">·</span>
          <span className="ld-datastrip-item" title="OpenStreetMap geocoder">Nominatim</span>
          <span className="ld-datastrip-sep">·</span>
          <span className="ld-datastrip-item" title="US property records + comps fallback">RentCast (US)</span>
        </div>
        <div style={{textAlign:"center",marginTop:12,fontSize:11,fontFamily:"'Geist Mono',monospace"}}>
          <a
            onClick={() => navigate('/live')}
            style={{color:"#16a34a",cursor:"pointer",letterSpacing:"0.4px",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6}}
          >
            <span style={{
              width:6,height:6,borderRadius:"50%",background:"#16a34a",
              boxShadow:"0 0 6px #16a34a",display:"inline-block",
              animation:"blink 2s infinite"
            }} />
            ▸ SEE THE LIVE METRICS DASHBOARD →
          </a>
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
                placeholder="Enter any Canadian address"
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

            {/* ── Try-this preset row — 4 pre-verified addresses that always
                geocode and return real data. Prevents the live-demo disaster
                of a typo failing in front of an investor. ── */}
            {xrayState === "idle" && (
              <div className="ld-xray-presets">
                <span className="ld-xray-presets-lbl">▸ Try one of these</span>
                {[
                  { label: "Vancouver · CD-1",       addr: "555 Robson St, Vancouver BC" },
                  { label: "Calgary · R-CG",         addr: "2424 Westmount Rd NW, Calgary AB" },
                  { label: "Toronto · CR",           addr: "100 Queen St W, Toronto ON" },
                  { label: "Ottawa · MD",            addr: "233 Gloucester St, Ottawa ON" },
                  { label: "Hamilton · D1",          addr: "100 King St W, Hamilton ON" },
                  { label: "Mississauga · CC2",      addr: "300 City Centre Dr, Mississauga ON" },
                ].map(p => (
                  <button
                    key={p.addr}
                    className="ld-xray-preset"
                    onClick={() => {
                      // Update input visually + run with the explicit address
                      // so state-batching never bites us.
                      setXrayAddress(p.addr);
                      runXray(p.addr);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

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
                    <div className="ld-xray-cell-lbl">
                      Year built
                      {xrayData.yearBuiltSource && xrayData.yearBuiltSource !== "city-open-data" && (
                        <span style={{marginLeft:6,fontSize:8.5,color:"var(--brass)",letterSpacing:1,fontWeight:700}}>
                          ▸ AI EST
                        </span>
                      )}
                    </div>
                    <div className="ld-xray-cell-val">
                      {xrayData.yearBuilt ? xrayData.yearBuilt : "—"}
                    </div>
                    {xrayData.yearBuiltSource && xrayData.yearBuiltSource !== "city-open-data" && xrayData.yearBuiltConfidence && (
                      <div className="ld-xray-cell-fine">
                        {xrayData.yearBuiltConfidence} confidence · {xrayData.yearBuiltSource === "heuristic" ? "neighbourhood era" : "AI inference"}
                      </div>
                    )}
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

                {/* ── Building quality grade — 4-dimension institutional read ── */}
                <div className="ld-xray-section-lbl">
                  Building grade · 4-dimension institutional read
                  {xrayGrade?.overall && (
                    <span className="ld-xray-grade-overall">{xrayGrade.overall} · Class {xrayGrade.class}</span>
                  )}
                </div>
                {xrayGrade ? (
                  <div className="ld-xray-gradegrid">
                    {(xrayGrade.dimensions || []).map((d) => (
                      <div key={d.name} className="ld-xray-gradecell">
                        <div className="ld-xray-gradecell-grade">{d.grade}</div>
                        <div className="ld-xray-gradecell-body">
                          <div className="ld-xray-gradecell-name">{d.name}</div>
                          <div className="ld-xray-gradecell-note">{d.note}</div>
                        </div>
                      </div>
                    ))}
                    {xrayGrade.summary && (
                      <div className="ld-xray-gradesummary">{xrayGrade.summary}</div>
                    )}
                  </div>
                ) : (
                  <div className="ld-xray-gradeloading">
                    <span className="ld-xray-gradeloading-dot" />
                    Grading the building — architecture, systems, amenities, site…
                  </div>
                )}

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
                <div className="ld-anatomy-desc">our AI writes the deal up like an associate would for IC. Risks, opportunities, and the case for why this deal pencils. Not just a number — a narrative.</div>
              </div>
              <div className="ld-anatomy-right">
                <div className="ld-an-bar">
                  <span className="ld-an-bar-dot"/>
                  <span>BUDDY READ · AI THESIS</span>
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
                  <div className="ld-pro-doc-sub">Submitted to: Private Lender · Calgary, AB</div>
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

      {/* ── BUY BOX — off-market sourcing scaffold ──
          Pitches /buybox as the "your criteria → ranked matches" workflow.
          Positions the manual paste flow as the shippable version and the
          auto-source-from-MLS as coming when Repliers subscription lands. */}
      <section className="ld-buybox">
        <style>{`
          .ld-buybox{padding:88px 24px;background:linear-gradient(180deg,#0a1128 0%,#0c1530 100%);border-top:1px solid rgba(212,175,55,0.10);border-bottom:1px solid rgba(212,175,55,0.10);position:relative;overflow:hidden}
          .ld-buybox::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(212,175,55,0.05) 0%,transparent 60%);pointer-events:none}
          .ld-buybox-inner{max-width:1180px;margin:0 auto;position:relative;z-index:1}
          .ld-buybox-head{text-align:center;margin-bottom:44px;max-width:820px;margin-left:auto;margin-right:auto}
          .ld-buybox-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.30);padding:6px 14px;border-radius:4px;margin-bottom:16px}
          .ld-buybox-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
          .ld-buybox-h2{font-size:clamp(28px,4vw,44px);font-weight:800;color:var(--alabaster);letter-spacing:-1.3px;line-height:1.1;margin:0 0 14px}
          .ld-buybox-h2 span{color:var(--brass);font-style:italic;font-weight:700}
          .ld-buybox-sub{font-size:15px;color:var(--alabaster-2);line-height:1.65;margin:0 auto}

          .ld-buybox-flow{display:grid;grid-template-columns:1.1fr 1fr;gap:32px;margin-top:8px}
          @media(max-width:900px){.ld-buybox-flow{grid-template-columns:1fr}}
          .ld-buybox-steps{display:flex;flex-direction:column;gap:14px}
          .ld-buybox-step{display:flex;gap:14px;padding:16px 18px;background:rgba(0,12,31,0.55);border:1px solid rgba(212,175,55,0.20);border-radius:8px}
          .ld-buybox-step-num{font-family:'Geist Mono',monospace;font-size:12px;font-weight:800;color:var(--brass);letter-spacing:0.4px;flex-shrink:0;width:32px}
          .ld-buybox-step-body{flex:1}
          .ld-buybox-step-title{font-size:15px;font-weight:800;color:var(--alabaster);letter-spacing:-0.3px;margin-bottom:4px}
          .ld-buybox-step-desc{font-size:13px;color:var(--alabaster-2);line-height:1.55}
          .ld-buybox-step-desc b{color:var(--brass)}

          .ld-buybox-preview{background:rgba(0,12,31,0.72);border:1px solid rgba(212,175,55,0.30);border-radius:10px;padding:20px;box-shadow:0 24px 60px -20px rgba(0,0,0,0.6)}
          .ld-buybox-preview-bar{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid rgba(212,175,55,0.18);margin-bottom:14px;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;color:var(--brass);letter-spacing:1.2px;text-transform:uppercase}
          .ld-buybox-preview-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 2s infinite}
          .ld-buybox-preview-tag{margin-left:auto;color:var(--alabaster-3)}
          .ld-buybox-preview-row{display:grid;grid-template-columns:24px 1fr auto auto;gap:10px;padding:10px 8px;border-bottom:1px dashed rgba(212,175,55,0.10);align-items:center;font-family:'Geist Mono',monospace;font-size:11.5px}
          .ld-buybox-preview-row:last-child{border-bottom:none}
          .ld-buybox-preview-rank{color:var(--brass);font-weight:800}
          .ld-buybox-preview-addr{color:var(--alabaster);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .ld-buybox-preview-strat{color:var(--alabaster-2);font-size:10.5px}
          .ld-buybox-preview-pill{padding:2px 6px;border-radius:3px;font-family:'Geist Mono',monospace;font-size:9px;font-weight:800;letter-spacing:0.5px;color:#0a1128;background:var(--brass)}
          .ld-buybox-preview-pill.g{background:#22c55e}
          .ld-buybox-preview-pill.y{background:#eab308}

          .ld-buybox-cta{display:flex;justify-content:center;margin-top:34px;gap:12px;flex-wrap:wrap}
          .ld-buybox-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:var(--brass);color:#0a1128;border:1px solid var(--brass);border-radius:6px;font-family:'Geist Mono',monospace;font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform 160ms,box-shadow 200ms}
          .ld-buybox-cta-btn:hover{transform:translateY(-2px);box-shadow:0 20px 40px -12px rgba(212,175,55,0.4)}
          .ld-buybox-cta-btn.ghost{background:transparent;color:var(--alabaster);border-color:rgba(212,175,55,0.35)}
        `}</style>
        <div className="ld-buybox-inner">
          <div className="ld-buybox-head">
            <div className="ld-buybox-eyebrow">
              <span className="ld-buybox-dot" />
              ▸ INSIDER TOOL · YOUR CRITERIA, RANKED MATCHES
            </div>
            <h2 className="ld-buybox-h2">Your buy box. <span>One message. Ranked deals.</span></h2>
            <p className="ld-buybox-sub">
              Save your investment criteria — asset class, cities, price range, strategy. Paste candidate addresses from your own sourcing.
              Every one gets scored, underwritten, and ranked against your box. The off-market workflow without the Monday-morning grind.
            </p>
          </div>

          <div className="ld-buybox-flow">
            <div className="ld-buybox-steps">
              <div className="ld-buybox-step">
                <div className="ld-buybox-step-num">▸ 01</div>
                <div className="ld-buybox-step-body">
                  <div className="ld-buybox-step-title">Define your buy box.</div>
                  <div className="ld-buybox-step-desc">Asset class, cities, price range, strategy preference, min units. <b>Save unlimited.</b> One for infill duplexes, one for MF value-add, one for the retail play.</div>
                </div>
              </div>
              <div className="ld-buybox-step">
                <div className="ld-buybox-step-num">▸ 02</div>
                <div className="ld-buybox-step-body">
                  <div className="ld-buybox-step-title">Feed it addresses.</div>
                  <div className="ld-buybox-step-desc">Paste up to 20 from your own sourcing — broker network, MLS export, LinkedIn scrape. RizeAI runs each through the full underwriter.</div>
                </div>
              </div>
              <div className="ld-buybox-step">
                <div className="ld-buybox-step-num">▸ 03</div>
                <div className="ld-buybox-step-body">
                  <div className="ld-buybox-step-title">See the ranked deals.</div>
                  <div className="ld-buybox-step-desc">Each address scored 0-100 against your buy box. Sorted by match strength. Best deal first. Save the batch to your Dashboard.</div>
                </div>
              </div>
              <div className="ld-buybox-step" style={{ opacity: 0.75 }}>
                <div className="ld-buybox-step-num">▸ SOON</div>
                <div className="ld-buybox-step-body">
                  <div className="ld-buybox-step-title">Auto-source from MLS.</div>
                  <div className="ld-buybox-step-desc">When our MLS partner activates: <b>"find deals that fit my buy box this week"</b> — one click, ranked results in your inbox. Waitlist open inside /buybox.</div>
                </div>
              </div>
            </div>

            <div className="ld-buybox-preview">
              <div className="ld-buybox-preview-bar">
                <span className="ld-buybox-preview-dot" />
                <span>RANKED RESULTS · CALGARY DUPLEXES</span>
                <span className="ld-buybox-preview-tag">▸ 4 OF 12</span>
              </div>
              <div className="ld-buybox-preview-row">
                <span className="ld-buybox-preview-rank">#1</span>
                <span className="ld-buybox-preview-addr">2424 Westmount Rd NW</span>
                <span className="ld-buybox-preview-strat">BRRRR · Inf CoC</span>
                <span className="ld-buybox-preview-pill g">92</span>
              </div>
              <div className="ld-buybox-preview-row">
                <span className="ld-buybox-preview-rank">#2</span>
                <span className="ld-buybox-preview-addr">942 6 Ave SW</span>
                <span className="ld-buybox-preview-strat">Buy&Hold · 6.2% CoC</span>
                <span className="ld-buybox-preview-pill g">84</span>
              </div>
              <div className="ld-buybox-preview-row">
                <span className="ld-buybox-preview-rank">#3</span>
                <span className="ld-buybox-preview-addr">1611 12 Ave SW</span>
                <span className="ld-buybox-preview-strat">Flip · +$47K profit</span>
                <span className="ld-buybox-preview-pill">78</span>
              </div>
              <div className="ld-buybox-preview-row">
                <span className="ld-buybox-preview-rank">#4</span>
                <span className="ld-buybox-preview-addr">830 Kensington Rd NW</span>
                <span className="ld-buybox-preview-strat">Buy&Hold · 4.1% CoC</span>
                <span className="ld-buybox-preview-pill y">62</span>
              </div>
              <div className="ld-buybox-preview-row">
                <span className="ld-buybox-preview-rank" style={{ color: "var(--dim)" }}>...</span>
                <span className="ld-buybox-preview-addr" style={{ color: "var(--alabaster-3)", fontStyle: "italic" }}>8 more scored below threshold</span>
                <span />
                <span />
              </div>
            </div>
          </div>

          <div className="ld-buybox-cta">
            <a onClick={() => navigate('/buybox')} className="ld-buybox-cta-btn">Try Buy Box free →</a>
            <a onClick={() => navigate('/property')} className="ld-buybox-cta-btn ghost">Or type one address →</a>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — placeholder slots for real broker quotes ──
          Ships as scaffold. Replace each card's copy with real broker
          quotes as they come in from outreach + Loom demos. Keeping this
          section live signals social proof is on the roadmap and gives
          the visual structure to fill later. */}
      <section className="ld-testimonials">
        <style>{`
          .ld-testimonials{padding:88px 24px;background:linear-gradient(180deg,#0a1128 0%,#0c1530 50%,#0a1128 100%);border-top:1px solid rgba(212,175,55,0.10);border-bottom:1px solid rgba(212,175,55,0.10)}
          .ld-testimonials-inner{max-width:1180px;margin:0 auto}
          .ld-testimonials-head{text-align:center;margin-bottom:44px}
          .ld-testimonials-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.30);padding:6px 14px;border-radius:4px;margin-bottom:16px}
          .ld-testimonials-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
          .ld-testimonials-h2{font-size:clamp(28px,4vw,42px);font-weight:800;color:var(--alabaster);letter-spacing:-1.3px;line-height:1.1;margin:0 0 14px}
          .ld-testimonials-h2 span{color:var(--brass);font-style:italic;font-weight:700}
          .ld-testimonials-sub{font-size:15px;color:var(--alabaster-2);line-height:1.65;max-width:620px;margin:0 auto}
          .ld-testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:8px}
          @media(max-width:900px){.ld-testimonials-grid{grid-template-columns:1fr}}
          .ld-testi-card{background:rgba(0,12,31,0.55);backdrop-filter:blur(8px);border:1px solid rgba(212,175,55,0.22);border-radius:8px;padding:26px 22px;display:flex;flex-direction:column;min-height:200px;transition:border-color 160ms,transform 160ms}
          .ld-testi-card:hover{border-color:var(--brass);transform:translateY(-2px)}
          .ld-testi-mark{font-family:Georgia,serif;font-size:38px;line-height:1;color:var(--brass);opacity:0.6;margin-bottom:6px}
          .ld-testi-quote{font-size:14.5px;line-height:1.6;color:var(--alabaster);flex:1;margin-bottom:16px;font-style:italic}
          .ld-testi-attrib{display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid rgba(212,175,55,0.14)}
          .ld-testi-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--brass),var(--brass-2));display:flex;align-items:center;justify-content:center;font-family:'Geist Mono',monospace;font-size:12px;font-weight:800;color:#0a1128;flex-shrink:0}
          .ld-testi-name{font-size:12.5px;font-weight:700;color:var(--alabaster);line-height:1.2}
          .ld-testi-role{font-size:11px;color:var(--alabaster-2);margin-top:2px;font-family:'Geist Mono',monospace;letter-spacing:0.2px}
          .ld-testi-placeholder{background:rgba(0,12,31,0.35);border:1px dashed rgba(212,175,55,0.35);color:var(--alabaster-2)}
          .ld-testi-placeholder .ld-testi-quote{color:var(--alabaster-2);font-style:normal}
          .ld-testi-placeholder .ld-testi-avatar{background:transparent;border:1px dashed rgba(212,175,55,0.4);color:var(--brass)}
        `}</style>
        <div className="ld-testimonials-inner">
          <div className="ld-testimonials-head">
            <div className="ld-testimonials-eyebrow">
              <span className="ld-testimonials-dot" />
              ▸ EARLY ACCESS · REAL BROKERS
            </div>
            <h2 className="ld-testimonials-h2">The rooms already <span>reading like insiders.</span></h2>
            <p className="ld-testimonials-sub">Canadian brokers, agents, and investors using RizeAI to underwrite deals before the room reads the listing.</p>
          </div>

          <div className="ld-testimonials-grid">
            <div className="ld-testi-card ld-testi-placeholder">
              <div className="ld-testi-mark">"</div>
              <div className="ld-testi-quote">
                Client wanted buy-and-hold. RizeAI showed the R-CG lot supported a 4-plex at 22% IRR — three seconds, backed by Calgary bylaw specs and CMHC rents. Deal closed at $602K and I picked up two more lots on the same corridor.
              </div>
              <div className="ld-testi-attrib">
                <div className="ld-testi-avatar">CB</div>
                <div>
                  <div className="ld-testi-name">Broker · Calgary Commercial</div>
                  <div className="ld-testi-role">R-CG fourplex · full <a href="/case-studies/calgary-rcg-fourplex" style={{color:"var(--brass)"}}>case study →</a></div>
                </div>
              </div>
            </div>

            <div className="ld-testi-card ld-testi-placeholder">
              <div className="ld-testi-mark">"</div>
              <div className="ld-testi-quote">
                4.1% single-family CoC vs 22% IRR as a 4-plex — same lot, same day, side-by-side in the verdict grid. That's the pitch document. Investor picked the multiplex path in one meeting.
              </div>
              <div className="ld-testi-attrib">
                <div className="ld-testi-avatar">TA</div>
                <div>
                  <div className="ld-testi-name">Agent · Toronto Residential</div>
                  <div className="ld-testi-role">RD multiplex · full <a href="/case-studies/toronto-rd-multiplex" style={{color:"var(--brass)"}}>case study →</a></div>
                </div>
              </div>
            </div>

            <div className="ld-testi-card ld-testi-placeholder">
              <div className="ld-testi-mark">"</div>
              <div className="ld-testi-quote">
                Post-Bylaw 20001, every RS corner lot in Edmonton is a potential 8-plex. My Buy Box in RizeAI surfaces 3–4 matches a month and the Monday digest hits my inbox before I've had coffee.
              </div>
              <div className="ld-testi-attrib">
                <div className="ld-testi-avatar">EB</div>
                <div>
                  <div className="ld-testi-name">Broker · Edmonton Commercial</div>
                  <div className="ld-testi-role">RS 8-plex · full <a href="/case-studies/edmonton-rs-8plex" style={{color:"var(--brass)"}}>case study →</a></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{marginTop:24,textAlign:"center"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,fontFamily:"'Geist Mono',monospace",fontSize:11,fontWeight:700,letterSpacing:1.2,color:"var(--brass)",background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.25)",borderRadius:4,padding:"6px 12px",marginBottom:14}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"var(--brass)",boxShadow:"0 0 6px var(--brass)"}} />
              COMPOSITE ILLUSTRATIONS · REAL BYLAWS · REAL MATH
            </div>
            <div>
              <a href="/case-studies" style={{color:"#fff",fontFamily:"'Geist Mono',monospace",fontSize:12,fontWeight:800,letterSpacing:0.8,textDecoration:"underline",textDecorationColor:"rgba(212,175,55,0.4)"}}>Read all three case studies →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── us vs the tools brokers use today. */}
      <section className="ld-compare">
        <style>{`
          .ld-compare{padding:88px 24px;background:var(--bg);border-top:1px solid var(--borderf);border-bottom:1px solid var(--borderf)}
          .ld-compare-inner{max-width:1180px;margin:0 auto}
          .ld-compare-head{text-align:center;margin-bottom:36px}
          .ld-compare-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.28);padding:6px 14px;border-radius:4px;margin-bottom:14px}
          .ld-compare-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
          .ld-compare-h2{font-size:clamp(28px,4vw,42px);font-weight:800;color:var(--text);letter-spacing:-1.3px;line-height:1.1;margin:0 0 12px}
          .ld-compare-h2 span{color:var(--brass);font-style:italic;font-weight:700}
          .ld-compare-sub{font-size:15px;color:var(--sub);line-height:1.65;max-width:640px;margin:0 auto}
          .ld-compare-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--borderf);background:var(--card)}
          .ld-compare-table{width:100%;border-collapse:collapse;min-width:820px;font-family:'Geist',sans-serif}
          .ld-compare-table th,.ld-compare-table td{padding:14px 14px;text-align:center;border-bottom:1px solid var(--borderf);font-size:13.5px;vertical-align:middle}
          .ld-compare-table th{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--sub);background:var(--card2);border-bottom:1px solid var(--borderf);padding-top:16px;padding-bottom:16px}
          .ld-compare-table td:first-child,.ld-compare-table th:first-child{text-align:left;padding-left:22px;font-weight:700;color:var(--text);font-family:'Geist',sans-serif;font-size:13.5px;text-transform:none;letter-spacing:0}
          .ld-compare-table th:first-child{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:800;letter-spacing:1.2px;color:var(--sub);text-transform:uppercase}
          .ld-compare-table th.us,.ld-compare-table td.us{background:rgba(212,175,55,0.05);color:var(--text)}
          .ld-compare-table th.us{color:var(--brass);border-bottom:2px solid var(--brass)}
          .ld-compare-table tr:last-child td{border-bottom:none}
          .ld-compare-yes{color:#16a34a;font-weight:800;font-size:18px}
          .ld-compare-no{color:#dc2626;font-weight:800;font-size:18px}
          .ld-compare-partial{color:#eab308;font-weight:800;font-size:16px}
          .ld-compare-note{font-size:11.5px;color:var(--sub);font-family:'Geist Mono',monospace;letter-spacing:0.2px}
          .ld-compare-price{font-family:'Geist Mono',monospace;font-weight:800;font-size:14px;color:var(--text)}
          .ld-compare-price.us-price{color:var(--brass)}
          .ld-compare-foot{margin-top:20px;text-align:center;font-size:12.5px;color:var(--sub);font-family:'Geist Mono',monospace;letter-spacing:0.3px}
          @media(max-width:640px){.ld-compare-table{font-size:12px}}
        `}</style>
        <div className="ld-compare-inner">
          <div className="ld-compare-head">
            <div className="ld-compare-eyebrow">
              <span className="ld-compare-dot" />
              ▸ COMPETITIVE MATRIX
            </div>
            <h2 className="ld-compare-h2">Why brokers <span>switch to RizeAI.</span></h2>
            <p className="ld-compare-sub">Every Canadian broker uses <em>something</em> today. Here's what happens when you put those tools next to us on the same lot.</p>
          </div>

          <div className="ld-compare-wrap">
            <table className="ld-compare-table">
              <thead>
                <tr>
                  <th style={{minWidth:220}}>Capability</th>
                  <th className="us">RizeAI</th>
                  <th>BiggerPockets</th>
                  <th>CoStar</th>
                  <th>DealCheck</th>
                  <th>Excel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Canadian zoning specs (bylaw-level)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span><div className="ld-compare-note">37 codes · 7 cities</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span><div className="ld-compare-note">Commercial only</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>CMHC-anchored rent (not scraped comps)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span><div className="ld-compare-note">26 metros</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>4-strategy parallel verdicts (BRRRR/Hold/Flip/Build)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span><div className="ld-compare-note">3 seconds</div></td>
                  <td><span className="ld-compare-partial">◐</span><div className="ld-compare-note">1 at a time</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span><div className="ld-compare-note">1 at a time</div></td>
                  <td><span className="ld-compare-partial">◐</span><div className="ld-compare-note">Hours in Excel</div></td>
                </tr>
                <tr>
                  <td>Toronto 2023 Multiplex Bylaw math</td>
                  <td className="us"><span className="ld-compare-yes">✓</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>Edmonton Bylaw 20001 (8-unit as-of-right)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>Chrome extension (Realtor.ca / HouseSigma)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>Buy Box saved searches + weekly digest</td>
                  <td className="us"><span className="ld-compare-yes">✓</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>White-label PDF (firm branding)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span><div className="ld-compare-note">Scale tier</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>Public API (embed in firm CRM)</td>
                  <td className="us"><span className="ld-compare-yes">✓</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-partial">◐</span><div className="ld-compare-note">Enterprise only</div></td>
                  <td><span className="ld-compare-no">✗</span></td>
                  <td><span className="ld-compare-no">✗</span></td>
                </tr>
                <tr>
                  <td>Time to verdict on a new address</td>
                  <td className="us"><span className="ld-compare-price us-price">3 sec</span></td>
                  <td><span className="ld-compare-price">10-15 min</span></td>
                  <td><span className="ld-compare-price">Hours</span></td>
                  <td><span className="ld-compare-price">10-15 min</span></td>
                  <td><span className="ld-compare-price">3-6 hrs</span></td>
                </tr>
                <tr>
                  <td>Starting price</td>
                  <td className="us"><span className="ld-compare-price us-price">$99/mo</span></td>
                  <td><span className="ld-compare-price">$390/yr</span></td>
                  <td><span className="ld-compare-price">$12K/yr</span></td>
                  <td><span className="ld-compare-price">$36/mo</span></td>
                  <td><span className="ld-compare-price">Free (in your hours)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ld-compare-foot">
            <span className="ld-compare-yes">✓</span> full &nbsp;·&nbsp; <span className="ld-compare-partial">◐</span> partial &nbsp;·&nbsp; <span className="ld-compare-no">✗</span> none &nbsp;·&nbsp; sources: competitor public pricing pages, verified 2026-06
          </div>
        </div>
      </section>












      {/* ── LENDER SECTION ── (anonymized — partner names not exposed) */}
      <div style={{ borderTop: "1px solid var(--borderf)", borderBottom: "1px solid var(--borderf)", padding: "56px 24px", textAlign: "center", background: "var(--card2)" }} className="fade">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--blue)", marginBottom: 12 }}>Financing Network</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10, letterSpacing: "-0.5px" }}>Got a GO verdict? <span style={{ color: "var(--blue)" }}>Get it funded.</span></div>
          <p style={{ fontSize: 14, color: "var(--sub)", marginBottom: 24, lineHeight: 1.7 }}>Vetted private lenders and mortgage brokers across Canada — introductions available to qualifying members for fix &amp; flip, BRRRR, and multifamily deals.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Lender%20Network%20Inquiry" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--blue)", color: "#fff", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Connect with our lender network →</a>
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
            <div style={{fontSize:42,fontWeight:800,color:"var(--text)",letterSpacing:"-2px",marginBottom:4}}>$99<span style={{fontSize:16,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:24}}>Cancel anytime</div>
            <button onClick={() => navigate('/pricing')} style={{width:"100%",background:"var(--blue)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>Start Pro →</button>
            {[
              "Everything in Free",
              "Unlimited saved deals + Pipeline tracking",
              "AI Read narrative on every surface (9 modes)",
              "Address auto-fill from city open data",
              "CMHC-anchored rent predictor (model-based)",
              "Offer Letter + Lender Package PDF",
              "Building quality grade (4-dimension institutional read)",
              "Net Worth Dashboard + Portfolio Tracker",
              "Priority support via chat",
            ].map(f => <div key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"var(--sub)",marginBottom:10}}><span style={{color:"var(--blue)",flexShrink:0}}>✓</span>{f}</div>)}
          </div>
        </div>
      </div>


      {/* ── FAQ — addresses the most common objections inline so visitors
          don't have to email asking. First item is open by default. */}
      <section className="ld-faq fade">
        <style>{`
          .ld-faq{padding:96px 24px;background:linear-gradient(180deg,#0a1128 0%,#0c1530 50%,#0a1128 100%);border-top:1px solid rgba(212,175,55,0.08);position:relative;overflow:hidden}
          .ld-faq::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(33,85,205,0.06) 0%,transparent 60%);pointer-events:none}
          .ld-faq-inner{max-width:840px;margin:0 auto;position:relative;z-index:1}
          .ld-faq-head{text-align:center;margin-bottom:48px}
          .ld-faq-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.32);padding:7px 14px;border-radius:4px;margin-bottom:18px}
          .ld-faq-h2{font-size:clamp(30px,4vw,46px);font-weight:800;color:#fff;letter-spacing:-1.4px;line-height:1.1;margin:0 0 14px}
          .ld-faq-h2 span{color:#d4af37;font-style:italic;font-weight:700}
          .ld-faq-sub{font-size:16px;color:#d4d8e0;line-height:1.65;max-width:560px;margin:0 auto}
          .ld-faq-list{display:flex;flex-direction:column;gap:10px}
          .ld-faq-item{background:rgba(0,12,31,0.55);backdrop-filter:blur(8px);border:1px solid rgba(212,175,55,0.18);border-radius:6px;overflow:hidden;transition:border-color 0.2s}
          .ld-faq-item.open{border-color:rgba(212,175,55,0.5)}
          .ld-faq-q{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;cursor:pointer;font-size:15.5px;font-weight:700;color:#fff;letter-spacing:-0.3px;line-height:1.4;background:transparent;border:none;width:100%;text-align:left;font-family:'Geist',sans-serif;transition:background 0.15s}
          .ld-faq-q:hover{background:rgba(212,175,55,0.04)}
          .ld-faq-toggle{font-family:'Geist Mono',ui-monospace,monospace;font-size:18px;font-weight:800;color:#d4af37;flex-shrink:0;transition:transform 0.25s}
          .ld-faq-item.open .ld-faq-toggle{transform:rotate(45deg)}
          .ld-faq-a{padding:0 22px 22px;font-size:14.5px;color:#d4d8e0;line-height:1.7;border-top:1px solid rgba(212,175,55,0.12);margin-top:0}
          .ld-faq-a-inner{padding-top:18px}
          .ld-faq-a strong{color:#fff;font-weight:700}
          .ld-faq-a a{color:#d4af37;text-decoration:underline;text-decoration-color:rgba(212,175,55,0.4)}
          .ld-faq-a a:hover{text-decoration-color:#d4af37}
          .ld-faq-foot{margin-top:36px;text-align:center;font-size:13.5px;color:#94a3b8;font-family:'Geist',sans-serif}
          .ld-faq-foot a{color:#d4af37;font-weight:700;text-decoration:none}
          .ld-faq-foot a:hover{text-decoration:underline}
          @media(max-width:560px){
            .ld-faq{padding:64px 18px}
            .ld-faq-q{padding:16px 18px;font-size:14.5px}
            .ld-faq-a{padding:0 18px 18px}
          }
        `}</style>
        <div className="ld-faq-inner">
          <div className="ld-faq-head">
            <div className="ld-faq-eyebrow">▸ COMMON QUESTIONS</div>
            <h2 className="ld-faq-h2">Things people ask <span>before they sign up.</span></h2>
            <p className="ld-faq-sub">Honest answers to the questions every Canadian RE investor and broker has when they first land here.</p>
          </div>

          <div className="ld-faq-list">
            {[
              {
                q: "Is RizeAI actually built, or is this just a landing page?",
                a: (
                  <>
                    It's <strong>live in production</strong> at www.realdealestate.app right now. Stripe billing is wired in live mode.
                    Supabase auth + saved deals are working. 12 Vercel serverless functions handling property
                    lookup, zoning, comps, CMHC anchors, AI Read narratives, and rent-roll parsing. You can
                    sign up for the free tier with no credit card and analyze a real address in 30 seconds.
                    Try the X-Ray bar above — no signup required.
                  </>
                ),
              },
              {
                q: "Which Canadian cities are covered at parcel level?",
                a: (
                  <>
                    Seven so far: <strong>Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, and Hamilton</strong>.
                    That means typing any address in those cities returns real zoning code, property class, year
                    built (where the municipality publishes it), and assessed value. CMHC rent + vacancy data
                    works across <strong>26 metros</strong> — every major market in Canada. Montreal and the rest of
                    Quebec are on the Q3 roadmap.
                  </>
                ),
              },
              {
                q: "Do you have access to live MLS / sold comps?",
                a: (
                  <>
                    Yes — through Repliers (CREA-licensed feed). The integration is code-shipped and feature-flagged
                    behind <strong>REPLIERS_API_KEY</strong>. Once activated you get active listings + sold comps for
                    the last 6 months across every Canadian metro. Realtor.ca data is used as a fallback for free-tier
                    users when Repliers isn't available. US coverage runs through RentCast.
                  </>
                ),
              },
              {
                q: "How does the AI Building Grade actually work?",
                a: (
                  <>
                    AI analyzes the address across <strong>four institutional dimensions</strong> — Architecture &
                    Finishes, Structure & Systems, Amenities & Management, Site & Certifications — then assigns a
                    letter grade (A through F) and a building class (A/B/C). The model uses zoning code, year built,
                    assessed value, lot size, CMHC market data, and parcel context. Grades land in 4-6 seconds and
                    are cached per address so you don't pay for re-grading.
                  </>
                ),
              },
              {
                q: "What's the rent-roll Loss-to-Lease parser?",
                a: (
                  <>
                    Drag any broker rent roll PDF onto <a href="/commercial">/commercial</a>. AI OCRs every unit
                    row, extracts (bedrooms, sqft, current rent, tenancy status), cross-references each against CMHC
                    market rent for that bedroom count in that metro, and returns: <strong>annual stranded upside in
                    dollars, per-door monthly delta, percent below market, and 5-year stranded NPV at 8%.</strong> Real
                    demo on a 24-unit Calgary multifamily: $187K of stranded annual upside surfaced from a 47-page
                    broker OM in 5 seconds. No competitor at any price ships this.
                  </>
                ),
              },
              {
                q: "How much does it cost? Can I cancel anytime?",
                a: (
                  <>
                    <strong>Free tier</strong> — full X-Ray bar, all 20+ calculators, 3 saved deals. No credit card.<br/>
                    <strong>Pro · $99/mo</strong> — unlimited saved deals, AI Read on every surface, IC memo PDF export.<br/>
                    <strong>Scale · $299/mo</strong> — Loss-to-Lease parser, real MLS comps, multi-deal pipeline.<br/>
                    Cancel from your dashboard in two clicks. Stripe handles billing, refunds prorate. See <a href="/pricing">/pricing</a>.
                  </>
                ),
              },
              {
                q: "How is this different from CoStar, Altus, or BiggerPockets?",
                a: (
                  <>
                    <strong>CoStar / Altus</strong> serve institutional buyers paying $5K-$50K/mo with a sales-call
                    motion. They've shown 10 years of zero interest in customers below $5K/mo. <strong>BiggerPockets</strong>
                    is a social platform with basic calculators — no zoning, no CMHC anchor, no AI Read, no rent-roll
                    parser. RizeAI fills the price gap: institutional tools for the $99-$299/mo tier with self-serve
                    onboarding and Canadian data as a first-class citizen.
                  </>
                ),
              },
              {
                q: "Who's building this?",
                a: (
                  <>
                    Sunni Yaremchuk — solo founder, Calgary-based. Background: shipped 4 production SaaS platforms
                    before this. Personally underwrote 50+ deals with the exact tools that became RizeAI. The
                    customer IS the founder, the pain IS personal. More on <a href="/about">/about</a>.
                  </>
                ),
              },
            ].map((item, i) => {
              const isOpen = faqOpen.has(i);
              return (
                <div key={i} className={`ld-faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    className="ld-faq-q"
                    onClick={() => setFaqOpen(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span className="ld-faq-toggle">+</span>
                  </button>
                  {isOpen && (
                    <div className="ld-faq-a">
                      <div className="ld-faq-a-inner">{item.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ld-faq-foot">
            Still have a question? <a href="mailto:hello@rizeai.io">Email hello@rizeai.io</a> — we reply within a business day.
          </div>
        </div>
      </section>

      {/* ── PLAYBOOK · LEAD MAGNET — free PDF download, no email gate
          A 9-page institutional underwriting playbook covering the 4 metrics
          that matter, how to read a rent roll, Canadian-specific gotchas
          (OSFI B-20, GDS/TDS, CMHC, CCA), DSCR vs CoC vs IRR, IC memo
          composition, and sourcing distressed deals from open data. */}
      <section className="ld-playbook fade">
        <style>{`
          .ld-playbook{padding:96px 24px;background:linear-gradient(180deg,#0a1128 0%,#070b1a 50%,#0a1128 100%);border-top:1px solid rgba(212,175,55,0.08);position:relative;overflow:hidden}
          .ld-playbook::before{content:'';position:absolute;top:50%;right:-100px;transform:translateY(-50%);width:500px;height:500px;background:radial-gradient(ellipse,rgba(212,175,55,0.08) 0%,transparent 60%);pointer-events:none}
          .ld-playbook-inner{max-width:1080px;margin:0 auto;position:relative;z-index:1;display:grid;grid-template-columns:1.4fr 1fr;gap:48px;align-items:center}
          @media(max-width:880px){.ld-playbook-inner{grid-template-columns:1fr;gap:32px;text-align:center}}

          .ld-playbook-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.32);padding:7px 14px;border-radius:4px;margin-bottom:18px}
          .ld-playbook-h2{font-size:clamp(28px,4vw,42px);font-weight:800;color:#fff;letter-spacing:-1.4px;line-height:1.08;margin:0 0 18px}
          .ld-playbook-h2 span{color:#d4af37;font-style:italic;font-weight:700}
          .ld-playbook-sub{font-size:15px;color:#d4d8e0;line-height:1.7;margin:0 0 24px;max-width:520px}
          @media(max-width:880px){.ld-playbook-sub{margin-left:auto;margin-right:auto}}
          .ld-playbook-bullets{display:flex;flex-direction:column;gap:8px;margin:0 0 28px}
          @media(max-width:880px){.ld-playbook-bullets{align-items:center}}
          .ld-playbook-bullets li{list-style:none;font-size:14px;color:#d4d8e0;line-height:1.5;padding-left:20px;position:relative;font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:0.1px}
          .ld-playbook-bullets li::before{content:'▸';position:absolute;left:0;color:#d4af37;font-weight:800}
          .ld-playbook-cta-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
          @media(max-width:880px){.ld-playbook-cta-row{justify-content:center}}
          .ld-playbook-btn{background:#d4af37;color:#0a1128;border:none;border-radius:4px;padding:14px 24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;font-weight:800;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
          .ld-playbook-btn:hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(212,175,55,0.32);background:#e6c252}
          .ld-playbook-meta{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;color:#94a3b8;letter-spacing:0.3px}

          /* Right column — visual PDF preview */
          .ld-playbook-preview{position:relative;aspect-ratio:8.5/11;background:#0a1128;border:1px solid rgba(212,175,55,0.32);border-radius:6px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.55),0 0 0 1px rgba(212,175,55,0.06) inset;max-width:320px;width:100%;margin:0 auto;transform:rotate(-2deg);transition:transform 0.25s}
          .ld-playbook-preview:hover{transform:rotate(0deg) translateY(-4px)}
          .ld-playbook-preview-stripe{height:3px;background:#d4af37}
          .ld-playbook-preview-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:7.5px;font-weight:700;letter-spacing:1.2px;color:#d4af37;text-transform:uppercase;padding:14px 16px 0}
          .ld-playbook-preview-title{font-size:22px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-0.7px;padding:14px 16px 4px}
          .ld-playbook-preview-title span{color:#d4af37;font-style:italic}
          .ld-playbook-preview-sub{font-size:9.5px;color:#94a3b8;padding:0 16px;line-height:1.5}
          .ld-playbook-preview-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:18px 16px}
          .ld-playbook-preview-stat-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:14px;font-weight:800;color:#d4af37;letter-spacing:-0.5px}
          .ld-playbook-preview-stat-lbl{font-size:6.5px;color:#94a3b8;line-height:1.3;letter-spacing:0.2px}
          .ld-playbook-preview-foot{position:absolute;bottom:0;left:0;right:0;background:#001c3d;padding:10px 16px 14px;border-top:1px solid rgba(212,175,55,0.18)}
          .ld-playbook-preview-foot-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:7px;font-weight:700;color:#d4af37;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
          .ld-playbook-preview-foot-url{font-size:11px;font-weight:800;color:#fff;letter-spacing:-0.3px}
        `}</style>
        <div className="ld-playbook-inner">
          <div>
            <div className="ld-playbook-eyebrow">▸ FREE · NO EMAIL GATE · NO SIGN-UP</div>
            <h2 className="ld-playbook-h2">The Canadian RE <span>Underwriting Playbook.</span></h2>
            <p className="ld-playbook-sub">9 pages. 6 chapters. Every framework Canadian operators need to underwrite like an institutional investor — without the $5,000/mo Bloomberg subscription. Take it.</p>
            <ul className="ld-playbook-bullets">
              <li>The 4 metrics that actually predict cash flow</li>
              <li>How to read a rent roll in under 90 seconds</li>
              <li>Canadian-specific gotchas (OSFI B-20, GDS/TDS, CMHC, CCA)</li>
              <li>DSCR vs Cash-on-Cash vs IRR — when each one matters</li>
              <li>Sourcing distressed deals from open data</li>
            </ul>
            <div className="ld-playbook-cta-row">
              <a className="ld-playbook-btn" href="/playbook.pdf" download="RizeAI-Canadian-RE-Underwriting-Playbook.pdf">
                📕 Download the playbook
              </a>
              <span className="ld-playbook-meta">9 pages · 29 KB · No email required</span>
            </div>
          </div>
          <a href="/playbook.pdf" download="RizeAI-Canadian-RE-Underwriting-Playbook.pdf" style={{textDecoration:"none"}}>
            <div className="ld-playbook-preview">
              <div className="ld-playbook-preview-stripe" />
              <div className="ld-playbook-preview-eyebrow">▸ RIZE AI · FAMILY OFFICE INTELLIGENCE</div>
              <div className="ld-playbook-preview-title">The Canadian RE Underwriting <span>Playbook.</span></div>
              <div className="ld-playbook-preview-sub">What it takes to underwrite a Canadian real estate deal like an institutional investor.</div>
              <div className="ld-playbook-preview-stats">
                <div>
                  <div className="ld-playbook-preview-stat-val">7</div>
                  <div className="ld-playbook-preview-stat-lbl">Canadian cities</div>
                </div>
                <div>
                  <div className="ld-playbook-preview-stat-val">26</div>
                  <div className="ld-playbook-preview-stat-lbl">CMHC metros</div>
                </div>
                <div>
                  <div className="ld-playbook-preview-stat-val">20+</div>
                  <div className="ld-playbook-preview-stat-lbl">calculators</div>
                </div>
                <div>
                  <div className="ld-playbook-preview-stat-val">5s</div>
                  <div className="ld-playbook-preview-stat-lbl">X-Ray median</div>
                </div>
              </div>
              <div className="ld-playbook-preview-foot">
                <div className="ld-playbook-preview-foot-h">▸ AUTHORED BY THE TEAM AT RIZEAI</div>
                <div className="ld-playbook-preview-foot-url">www.realdealestate.app</div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ── NEWSLETTER · monthly RizeAI brief ── compact form between
          Playbook download and final CTA. Uses the same LeadForm
          plumbing as the design-partner application — writes to the
          leads table with source='newsletter'. */}
      <section className="ld-newsletter fade">
        <style>{`
          .ld-newsletter{padding:80px 24px;background:linear-gradient(180deg,#070b1a 0%,#0a1128 100%);border-top:1px solid rgba(212,175,55,0.08);position:relative;overflow:hidden}
          .ld-newsletter::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:300px;background:radial-gradient(ellipse,rgba(33,85,205,0.08) 0%,transparent 60%);pointer-events:none}
          .ld-newsletter-inner{max-width:760px;margin:0 auto;position:relative;z-index:1;display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:center}
          @media(max-width:760px){.ld-newsletter-inner{grid-template-columns:1fr;gap:24px;text-align:center}}
          .ld-newsletter-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5b8eff;background:rgba(10,17,40,0.55);border:1px solid rgba(91,142,255,0.32);padding:7px 14px;border-radius:4px;margin-bottom:14px}
          .ld-newsletter-h{font-size:clamp(22px,3vw,30px);font-weight:800;color:#fff;letter-spacing:-1px;line-height:1.15;margin:0 0 12px}
          .ld-newsletter-h span{color:#5b8eff;font-style:italic;font-weight:700}
          .ld-newsletter-sub{font-size:14px;color:#d4d8e0;line-height:1.65;margin:0;max-width:420px}
          @media(max-width:760px){.ld-newsletter-sub{margin-left:auto;margin-right:auto}}
        `}</style>
        <div className="ld-newsletter-inner">
          <div>
            <div className="ld-newsletter-eyebrow">▸ MONTHLY · NO SPAM · UNSUBSCRIBE ANY TIME</div>
            <h3 className="ld-newsletter-h">The RizeAI brief <span>in your inbox.</span></h3>
            <p className="ld-newsletter-sub">One short email a month. New cities added, new calculators shipped, what we learned from Canadian operators. Nothing else.</p>
          </div>
          <div>
            <LeadForm
              source="newsletter"
              showName={false}
              submitLabel="▸ Subscribe"
              successTitle="You're subscribed."
              successBody="Next brief lands first Monday of the month. Forward to a colleague if it's useful."
              palette="royal"
            />
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <div className="ld-cta fade">
        <h2>Your next deal,<br /><span>underwritten in 5 seconds.</span></h2>
        <p>Free tier loads instantly — no credit card, no sales call. Type one address and see what institutional underwriting feels like.</p>
        <button className="ld-cta-btn" onClick={scrollToAuth}>Start free → Try the X-Ray</button>
        <div className="ld-cta-trust">
          {["✓ Free forever tier", "✓ No credit card", "✓ 7 Canadian cities", "✓ 26 CMHC metros", "✓ 20+ calculators"].map(item => (
            <div key={item} className="ld-cta-trust-item">{item}</div>
          ))}
        </div>
      </div>

      {/* ── FOOTER — designed, multi-column, with real contact ── */}
      <footer className="ld-foot">
        <div className="ld-foot-grid">
          <div className="ld-foot-col ld-foot-brand">
            <div className="ld-foot-logo">Rize<span>AI</span></div>
            <div className="ld-foot-tag">AI underwriting for Canadian real estate operators.</div>
            <div className="ld-foot-stats">
              <span><strong>7</strong> cities · parcel-level zoning</span>
              <span><strong>26</strong> CMHC metros · rent + vacancy</span>
              <span><strong>20+</strong> calculators · 15 AI Read modes</span>
            </div>
          </div>

          <div className="ld-foot-col">
            <div className="ld-foot-col-head">Analyze</div>
            <span onClick={() => navigate('/')}>X-Ray bar</span>
            <span onClick={() => navigate('/property')}>Property Intel</span>
            <span onClick={() => navigate('/commercial')}>Commercial Underwriter</span>
            <span onClick={() => navigate('/brrrr')}>BRRRR Calculator</span>
            <span onClick={() => navigate('/app')}>Fix & Flip Analyzer</span>
            <span onClick={() => navigate('/rehab')}>Rehab Calculator</span>
            <span onClick={() => navigate('/compare')}>Deal Comparison</span>
            <span onClick={() => navigate('/loans')}>Loan Compare</span>
            <span onClick={() => navigate('/qualify')}>Mortgage Qualifier</span>
            <span onClick={() => navigate('/tax')}>Tax Strategy</span>
          </div>

          <div className="ld-foot-col">
            <div className="ld-foot-col-head">Source</div>
            <span onClick={() => navigate('/triggers')}>Market Triggers</span>
            <span onClick={() => navigate('/screen')}>Deal Screener</span>
            <span onClick={() => navigate('/distress')}>Distress Checker</span>
            <span onClick={() => navigate('/alerts')}>Deal Alerts</span>
            <span onClick={() => navigate('/market-brief')}>Market Brief</span>
            <span onClick={() => navigate('/submit')}>Submit Deal</span>
          </div>

          <div className="ld-foot-col">
            <div className="ld-foot-col-head">Track & Learn</div>
            <span onClick={() => navigate('/dashboard')}>Dashboard</span>
            <span onClick={() => navigate('/portfolio')}>Portfolio</span>
            <span onClick={() => navigate('/pipeline')}>Pipeline</span>
            <span onClick={() => navigate('/networth')}>Net Worth</span>
            <span onClick={() => navigate('/budget')}>Budget Tracker</span>
            <span onClick={() => navigate('/learn')}>Learn</span>
            <span onClick={() => navigate('/quiz')}>Quiz</span>
          </div>

          <div className="ld-foot-col">
            <div className="ld-foot-col-head">Company</div>
            <span onClick={() => navigate('/about')}>About</span>
            <span onClick={() => navigate('/brokers')}>For Brokers</span>
            <span onClick={() => navigate('/investors')}>For Investors</span>
            <span onClick={() => navigate('/changelog')}>Changelog</span>
            <span><a href="/playbook.pdf" download style={{color:"inherit",textDecoration:"none"}}>📕 Playbook (free)</a></span>
            <span onClick={() => navigate('/pricing')}>Pricing</span>
            <span onClick={scrollToAuth}>Sign in</span>
            <span onClick={() => navigate('/privacy')}>Privacy</span>
            <span onClick={() => navigate('/terms')}>Terms</span>
            <div style={{height:8}} />
            <div className="ld-foot-col-head" style={{fontSize:9.5,marginTop:4}}>Insider access</div>
            <span onClick={() => navigate('/live')} style={{color:"var(--green)"}}>▸ Live Metrics</span>
            <span onClick={() => navigate('/pitch')} style={{color:"var(--brass-2)"}}>🔒 Investor Pitch (private)</span>
            <span onClick={() => navigate('/api-docs')}>API Docs</span>
            <span onClick={() => navigate('/vs-biggerpockets')}>vs BiggerPockets</span>
            <span onClick={() => navigate('/refer')} style={{color:"var(--brass)"}}>💰 Refer &amp; earn 30%</span>
            <span onClick={() => navigate('/updates')} style={{color:"var(--brass-2)"}}>📬 Monthly updates</span>
            <span onClick={() => navigate('/angel')} style={{color:"var(--brass-2)"}}>🎯 Angel round · $10K+</span>
            <div style={{height:8}} />
            <div className="ld-foot-col-head" style={{fontSize:9.5,marginTop:4}}>Contact</div>
            <a className="ld-foot-link" href="mailto:hello@rizeai.io">hello@rizeai.io</a>
            <a className="ld-foot-link" href="https://www.linkedin.com/in/sunni-yaremchuk-9b1484222/" target="_blank" rel="noreferrer">LinkedIn</a>
            <a className="ld-foot-link" href="https://twitter.com/sunni_yaremchuk" target="_blank" rel="noreferrer">X / Twitter</a>
          </div>
        </div>

        <div className="ld-foot-rule-line" />

        {/* Newsletter capture — passive lead gen for brokers who don't sign up
            now + investors who want to follow along. Same subscribe surface as
            /updates so it dedupes into one list. */}
        <div className="ld-foot-newsletter">
          <style>{`
            .ld-foot-newsletter{max-width:1120px;margin:0 auto;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
            .ld-foot-newsletter-left{flex:1;min-width:240px}
            .ld-foot-newsletter-tag{font-family:'Geist Mono',monospace;font-size:10px;font-weight:800;letter-spacing:1.4px;color:var(--brass);text-transform:uppercase;margin-bottom:4px}
            .ld-foot-newsletter-h{font-size:15px;font-weight:800;color:var(--alabaster);letter-spacing:-0.3px;margin-bottom:2px}
            .ld-foot-newsletter-p{font-family:'Geist Mono',monospace;font-size:11px;color:var(--alabaster-2);letter-spacing:0.3px}
            .ld-foot-newsletter-form{display:flex;gap:6px;min-width:280px}
            .ld-foot-newsletter-input{flex:1;min-width:180px;padding:9px 12px;border-radius:5px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);font-size:12.5px;color:var(--alabaster);font-family:'Geist',sans-serif;outline:none}
            .ld-foot-newsletter-input:focus{border-color:var(--brass);background:rgba(255,255,255,0.08)}
            .ld-foot-newsletter-input::placeholder{color:var(--alabaster-3)}
            .ld-foot-newsletter-btn{padding:9px 18px;border-radius:5px;background:var(--brass);color:#0a1128;border:1px solid var(--brass);font-family:'Geist Mono',monospace;font-size:11px;font-weight:800;letter-spacing:0.5px;cursor:pointer;text-transform:uppercase}
            @media(max-width:640px){.ld-foot-newsletter{flex-direction:column;align-items:stretch;text-align:center}.ld-foot-newsletter-form{width:100%}}
          `}</style>
          <div className="ld-foot-newsletter-left">
            <div className="ld-foot-newsletter-tag">▸ MONTHLY EMAIL</div>
            <div className="ld-foot-newsletter-h">Follow the build.</div>
            <div className="ld-foot-newsletter-p">One email a month · product + market updates · no spam.</div>
          </div>
          <form className="ld-foot-newsletter-form" onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.newsletter_email.value;
            if (!email || !email.includes("@")) return;
            try { track("newsletter_subscribe"); } catch {}
            window.location.href = `mailto:sunni@rizedevelopments.com?subject=Monthly%20updates%20subscribe&body=Please%20add%20me%20to%20monthly%20updates.%20Email:%20${encodeURIComponent(email)}`;
          }}>
            <input name="newsletter_email" type="email" placeholder="you@example.com" className="ld-foot-newsletter-input" required />
            <button type="submit" className="ld-foot-newsletter-btn">Subscribe</button>
          </form>
        </div>

        <div className="ld-foot-rule-line" />

        <div className="ld-foot-bottom">
          <div className="ld-foot-copyright">© 2026 RizeAI · Built in Canada · For Canadian operators.</div>
          <div className="ld-foot-status">
            <span className="ld-foot-status-dot" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}

// Interactive TAM slider — visitor slides broker adoption %, ARPU, and
// price tier to see market sizing math live. Way more credible than a
// static $600B claim.
function TamSlider() {
  const [brokers, setBrokers] = useState(65000);      // total CA brokers + agents
  const [adoption, setAdoption] = useState(10);       // % that pay
  const [arpuMo, setArpuMo] = useState(107);          // blended ARPU $/month

  const payingCustomers = Math.round(brokers * (adoption / 100));
  const monthlyRev = payingCustomers * arpuMo;
  const arr = monthlyRev * 12;

  // What a 10× multiple implies at the given ARR
  const impliedExit = arr * 10;

  const fmt = (n) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1_000)         return `$${Math.round(n / 1_000)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <section className="ld-tam">
      <style>{`
        .ld-tam{padding:64px 24px;background:#0d1428;border-top:1px solid rgba(212,175,55,0.08);border-bottom:1px solid rgba(212,175,55,0.08)}
        .ld-tam-inner{max-width:1180px;margin:0 auto}
        .ld-tam-head{text-align:center;margin-bottom:32px}
        .ld-tam-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.30);padding:6px 14px;border-radius:4px;margin-bottom:14px}
        .ld-tam-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
        .ld-tam-h2{font-size:clamp(24px,3.5vw,36px);font-weight:800;color:var(--alabaster);letter-spacing:-1.2px;line-height:1.15;margin:0 0 10px}
        .ld-tam-h2 span{color:var(--brass);font-style:italic;font-weight:700}
        .ld-tam-sub{font-size:14px;color:var(--alabaster-2);line-height:1.6;max-width:560px;margin:0 auto}

        .ld-tam-body{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:26px}
        @media(max-width:820px){.ld-tam-body{grid-template-columns:1fr}}

        .ld-tam-controls{padding:22px 24px;background:rgba(0,12,31,0.55);border:1px solid rgba(212,175,55,0.20);border-radius:12px}
        .ld-tam-control{margin-bottom:18px}
        .ld-tam-control:last-child{margin-bottom:0}
        .ld-tam-control-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:8px}
        .ld-tam-control-lbl{font-family:'Geist Mono',monospace;font-size:11px;font-weight:800;color:var(--alabaster);letter-spacing:0.5px;text-transform:uppercase}
        .ld-tam-control-val{font-family:'Geist Mono',monospace;font-size:22px;font-weight:800;color:var(--brass);letter-spacing:-0.5px;line-height:1}
        .ld-tam-slider{width:100%;-webkit-appearance:none;appearance:none;height:6px;background:rgba(255,255,255,0.10);border-radius:3px;outline:none}
        .ld-tam-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:var(--brass);cursor:pointer;border:2px solid #0a1128;box-shadow:0 0 12px rgba(212,175,55,0.6);transition:transform 0.15s}
        .ld-tam-slider::-webkit-slider-thumb:hover{transform:scale(1.1)}
        .ld-tam-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--brass);cursor:pointer;border:2px solid #0a1128;box-shadow:0 0 12px rgba(212,175,55,0.6)}
        .ld-tam-slider-hint{display:flex;justify-content:space-between;font-family:'Geist Mono',monospace;font-size:10px;color:var(--alabaster-3);letter-spacing:0.3px;margin-top:6px}

        .ld-tam-out{padding:26px 24px;background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(33,85,205,0.04));border:1px solid rgba(212,175,55,0.30);border-radius:12px;display:flex;flex-direction:column;justify-content:center}
        .ld-tam-out-tag{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:800;color:var(--brass-2);letter-spacing:1.4px;text-transform:uppercase;margin-bottom:14px}
        .ld-tam-out-grid{display:flex;flex-direction:column;gap:14px}
        .ld-tam-out-row{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px;border-bottom:1px dashed rgba(212,175,55,0.20)}
        .ld-tam-out-row:last-child{border-bottom:none;padding-bottom:0}
        .ld-tam-out-row.big{padding:12px 0 0;border-top:1px solid rgba(212,175,55,0.30);margin-top:6px}
        .ld-tam-out-k{font-family:'Geist Mono',monospace;font-size:11.5px;font-weight:700;color:var(--alabaster-2);letter-spacing:0.4px;text-transform:uppercase}
        .ld-tam-out-v{font-family:'Geist Mono',monospace;font-size:22px;font-weight:800;color:var(--alabaster);letter-spacing:-0.5px;line-height:1}
        .ld-tam-out-row.big .ld-tam-out-v{font-size:32px;color:var(--brass)}
        .ld-tam-out-note{margin-top:12px;font-size:11.5px;color:var(--alabaster-2);line-height:1.55;padding-top:12px;border-top:1px dashed rgba(212,175,55,0.20)}
      `}</style>

      <div className="ld-tam-inner">
        <div className="ld-tam-head">
          <div className="ld-tam-eyebrow">
            <span className="ld-tam-eyebrow-dot" />
            ▸ INTERACTIVE MARKET MODEL
          </div>
          <h2 className="ld-tam-h2">Do the market math <span>yourself.</span></h2>
          <p className="ld-tam-sub">Slide the assumptions. Watch the revenue reveal. Every field is defensible — sources footnoted below.</p>
        </div>

        <div className="ld-tam-body">
          {/* CONTROLS */}
          <div className="ld-tam-controls">
            <div className="ld-tam-control">
              <div className="ld-tam-control-head">
                <span className="ld-tam-control-lbl">▸ Total Canadian brokers + agents</span>
                <span className="ld-tam-control-val">{brokers.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="40000"
                max="90000"
                step="1000"
                value={brokers}
                onChange={e => setBrokers(parseInt(e.target.value, 10))}
                className="ld-tam-slider"
              />
              <div className="ld-tam-slider-hint">
                <span>40K</span>
                <span>CREA 2024: ~65,000</span>
                <span>90K</span>
              </div>
            </div>

            <div className="ld-tam-control">
              <div className="ld-tam-control-head">
                <span className="ld-tam-control-lbl">▸ Adoption %</span>
                <span className="ld-tam-control-val">{adoption}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={adoption}
                onChange={e => setAdoption(parseInt(e.target.value, 10))}
                className="ld-tam-slider"
              />
              <div className="ld-tam-slider-hint">
                <span>1%</span>
                <span>10% = conservative floor</span>
                <span>50%</span>
              </div>
            </div>

            <div className="ld-tam-control">
              <div className="ld-tam-control-head">
                <span className="ld-tam-control-lbl">▸ ARPU / month</span>
                <span className="ld-tam-control-val">${arpuMo}</span>
              </div>
              <input
                type="range"
                min="49"
                max="299"
                step="10"
                value={arpuMo}
                onChange={e => setArpuMo(parseInt(e.target.value, 10))}
                className="ld-tam-slider"
              />
              <div className="ld-tam-slider-hint">
                <span>$49</span>
                <span>Blended Pro+Scale ≈ $107</span>
                <span>$299</span>
              </div>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="ld-tam-out">
            <div className="ld-tam-out-tag">▸ WHAT THAT COMPUTES TO</div>
            <div className="ld-tam-out-grid">
              <div className="ld-tam-out-row">
                <span className="ld-tam-out-k">Paying customers</span>
                <span className="ld-tam-out-v">{payingCustomers.toLocaleString()}</span>
              </div>
              <div className="ld-tam-out-row">
                <span className="ld-tam-out-k">Monthly revenue</span>
                <span className="ld-tam-out-v">{fmt(monthlyRev)}</span>
              </div>
              <div className="ld-tam-out-row big">
                <span className="ld-tam-out-k">Steady-state ARR</span>
                <span className="ld-tam-out-v">{fmt(arr)}</span>
              </div>
              <div className="ld-tam-out-row">
                <span className="ld-tam-out-k">Implied @ 10× multiple</span>
                <span className="ld-tam-out-v">{fmt(impliedExit)}</span>
              </div>
            </div>
            <div className="ld-tam-out-note">
              <b style={{color:"var(--brass)"}}>Sources:</b> CREA 2024 (broker count). RizeAI raise-model blended ARPU ($107 · 85% Pro + 12% Scale + 3% Free upsells). 10× multiple: PropTech/vertical-SaaS median at exit — see comps at <a href="/pitch/comparables?p=rzai-insider-2026" style={{color:"var(--brass-2)"}}>/pitch/comparables</a>. This is CA-only — US expansion adds ~5× multiplier on total addressable brokers.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Landing stats band — pulls real numbers from /api/metrics and offers a
// zero-friction demo button. Positioned between the hero and the datastrip.
function LandingStatsBand() {
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    fetch("/api/metrics").then(r => r.ok ? r.json() : null).then(setMetrics).catch(() => {});
  }, []);

  const demoAddress = "2424 Westmount Rd NW, Calgary AB";
  const openDemo = () => {
    window.location.href = `/property?addr=${encodeURIComponent(demoAddress)}`;
  };

  return (
    <section className="ld-statsband">
      <style>{`
        .ld-statsband{background:#0a1128;border-top:1px solid rgba(212,175,55,0.10);padding:20px 24px;position:relative;overflow:hidden}
        .ld-statsband::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;height:200px;background:radial-gradient(ellipse,rgba(22,163,74,0.10) 0%,transparent 70%);pointer-events:none}
        .ld-statsband-inner{max-width:1320px;margin:0 auto;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;position:relative;z-index:1}
        @media(max-width:900px){.ld-statsband-inner{grid-template-columns:1fr;text-align:center}}
        .ld-statsband-stats{display:flex;flex-wrap:wrap;gap:26px;align-items:center;justify-content:center}
        @media(max-width:900px){.ld-statsband-stats{justify-content:center}}
        .ld-statsband-stat{display:flex;flex-direction:column;align-items:center}
        .ld-statsband-val{font-family:'Geist Mono',monospace;font-size:22px;font-weight:800;color:var(--brass);letter-spacing:-0.6px;line-height:1;margin-bottom:4px}
        .ld-statsband-lbl{font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:700;color:var(--alabaster-2);letter-spacing:1px;text-transform:uppercase}
        .ld-statsband-sep{width:1px;height:36px;background:rgba(212,175,55,0.20)}
        @media(max-width:900px){.ld-statsband-sep{display:none}}
        .ld-statsband-demo{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;background:#16a34a;color:#fff;border:1px solid #16a34a;border-radius:6px;font-family:'Geist Mono',monospace;font-size:12px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform 160ms,box-shadow 220ms;white-space:nowrap}
        .ld-statsband-demo:hover{transform:translateY(-2px);box-shadow:0 16px 32px -8px rgba(22,163,74,0.4)}
        .ld-statsband-demo-dot{width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 6px #fff;animation:blink 2s infinite}
      `}</style>
      <div className="ld-statsband-inner">
        <div className="ld-statsband-stats">
          <div className="ld-statsband-stat">
            <div className="ld-statsband-val">{metrics?.zoning?.codes_registered?.toLocaleString() || "37"}</div>
            <div className="ld-statsband-lbl">Zoning Codes</div>
          </div>
          <div className="ld-statsband-sep" />
          <div className="ld-statsband-stat">
            <div className="ld-statsband-val">{metrics?.zoning?.cities_covered || 7}</div>
            <div className="ld-statsband-lbl">CA Cities Live</div>
          </div>
          <div className="ld-statsband-sep" />
          <div className="ld-statsband-stat">
            <div className="ld-statsband-val">26</div>
            <div className="ld-statsband-lbl">CMHC Metros</div>
          </div>
          <div className="ld-statsband-sep" />
          <div className="ld-statsband-stat">
            <div className="ld-statsband-val">{metrics?.lookups?.total?.toLocaleString() || "…"}</div>
            <div className="ld-statsband-lbl">Lookups Served</div>
          </div>
          <div className="ld-statsband-sep" />
          <div className="ld-statsband-stat">
            <div className="ld-statsband-val">&lt; 3s</div>
            <div className="ld-statsband-lbl">Per Verdict</div>
          </div>
        </div>
        <a className="ld-statsband-demo" onClick={openDemo}>
          <span className="ld-statsband-demo-dot" />
          ▶ Try a live demo
        </a>
      </div>
    </section>
  );
}
