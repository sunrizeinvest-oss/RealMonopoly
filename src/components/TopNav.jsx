import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

/**
 * TopNav — unified top navigation shared across every page.
 *
 * Replaces the per-page bespoke navs (.br-nav, .mf-nav, .da-nav, .ds-nav, …)
 * with one component so navigation is consistent everywhere.
 *
 * Center: a "Tools" button that opens a mega-menu of all 20 tools organized
 * by category — same shape as Landing's toolkit grid. Right side: auth/account.
 *
 * The active route is highlighted inside the dropdown so the user always knows
 * where they are within the platform.
 *
 * Each tool button also fires its dynamic import() on hover/focus so the
 * route chunk is in browser cache by the time the user clicks. Makes
 * navigation feel instant on a code-split bundle.
 */

// Route → dynamic-import thunk. Hovering a tool kicks off the import; the
// bundler caches the chunk so the subsequent click renders with zero latency.
// Mirrors the lazy() routes declared in src/main.jsx.
const PRELOAD = {
  "/app":        () => import("../App.jsx"),
  "/brrrr":      () => import("../BRRRRCalculator.jsx"),
  "/commercial": () => import("../CommercialAnalyzer.jsx"),
  "/compare":    () => import("../DealComparison.jsx"),
  "/loans":      () => import("../LoanCompare.jsx"),
  "/qualify":    () => import("../MortgageQualifier.jsx"),
  "/property":   () => import("../PropertyIntelligence.jsx"),
  "/worth":      () => import("../PropertyWorth.jsx"),
  "/screen":     () => import("../DealScreener.jsx"),
  "/distress":   () => import("../DistressChecker.jsx"),
  "/triggers":   () => import("../MarketTriggers.jsx"),
  "/market-brief": () => import("../MarketBrief.jsx"),
  "/dashboard":  () => import("../Dashboard.jsx"),
  "/pipeline":   () => import("../Pipeline.jsx"),
  "/portfolio":  () => import("../Portfolio.jsx"),
  "/networth":   () => import("../NetWorth.jsx"),
  "/budget":     () => import("../BudgetTracker.jsx"),
  "/alerts":     () => import("../DealAlerts.jsx"),
  "/rehab":      () => import("../RehabCalculator.jsx"),
  "/tax":        () => import("../TaxCalculator.jsx"),
  "/learn":      () => import("../Learn.jsx"),
  "/quiz":       () => import("../Quiz.jsx"),
};

// Dedupe so each chunk is requested at most once even if the user hovers
// over the same item dozens of times.
const preloaded = new Set();
function preloadRoute(route) {
  if (preloaded.has(route)) return;
  const thunk = PRELOAD[route];
  if (!thunk) return;
  preloaded.add(route);
  // Fire-and-forget; if the import rejects, mark as un-preloaded so a
  // future hover can try again.
  thunk().catch(() => preloaded.delete(route));
}

const TOOLS = [
  {
    cat: "ANALYZE",
    color: "var(--green)",
    tools: [
      { icon: "🏚️", name: "Fix & Flip",          route: "/app" },
      { icon: "🔄", name: "BRRRR",               route: "/brrrr" },
      { icon: "🏢", name: "Multifamily",         route: "/commercial" },
      { icon: "⚡", name: "Deal Compare",        route: "/compare" },
      { icon: "💰", name: "Loan Compare",        route: "/loans" },
      { icon: "📊", name: "Mortgage Qualifier",  route: "/qualify" },
    ],
  },
  {
    cat: "SOURCE",
    color: "var(--blue)",
    tools: [
      { icon: "🛰️", name: "Property Intel",      route: "/property" },
      { icon: "💎", name: "Property Worth",      route: "/worth" },
      { icon: "🔎", name: "Deal Screener",       route: "/screen" },
      { icon: "🚨", name: "Distress Checker",    route: "/distress" },
      { icon: "📡", name: "Market Triggers",     route: "/triggers" },
      { icon: "📰", name: "Market Brief",        route: "/market-brief" },
    ],
  },
  {
    cat: "TRACK",
    color: "var(--purple)",
    tools: [
      { icon: "📋", name: "Dashboard",     route: "/dashboard" },
      { icon: "📈", name: "Pipeline",      route: "/pipeline" },
      { icon: "🏘️", name: "Portfolio",     route: "/portfolio" },
      { icon: "💼", name: "Net Worth",     route: "/networth" },
      { icon: "📐", name: "Budget",        route: "/budget" },
      { icon: "🔔", name: "Alerts",        route: "/alerts" },
    ],
  },
  {
    cat: "SPECIALIST",
    color: "var(--amber)",
    tools: [
      { icon: "🛠️", name: "Rehab Calc",     route: "/rehab" },
      { icon: "📑", name: "Tax Strategy",   route: "/tax" },
    ],
  },
  {
    cat: "LEARN",
    color: "var(--red)",
    tools: [
      { icon: "📚", name: "Education Hub", route: "/learn" },
      { icon: "🎯", name: "Quiz",          route: "/quiz" },
    ],
  },
];

export default function TopNav({ section = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth?.() || {};
  const { user, signOut } = auth;

  const [toolsOpen, setToolsOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close menus when clicking outside or pressing Esc
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setToolsOpen(false);
        setAcctOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") { setToolsOpen(false); setAcctOpen(false); }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Find current section label for the breadcrumb
  const currentTool = TOOLS.flatMap(c => c.tools).find(t => t.route === location.pathname);
  const breadcrumb = section || currentTool?.name;

  const go = (route) => () => {
    setToolsOpen(false);
    navigate(route);
  };

  return (
    <>
      <style>{css}</style>
      <nav className="tn-nav" ref={wrapRef}>
        <a className="tn-logo" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
          Real <span>Deal</span>
        </a>

        <div className="tn-center">
          <button
            data-tour="tools-btn"
            className={`tn-tools-btn ${toolsOpen ? "open" : ""}`}
            onClick={() => { setToolsOpen(v => !v); setAcctOpen(false); }}
            aria-expanded={toolsOpen}
          >
            <span className="tn-tools-dot"/>
            <span>Tools</span>
            <span className="tn-tools-chev">{toolsOpen ? "▴" : "▾"}</span>
          </button>

          {breadcrumb && (
            <div className="tn-breadcrumb">
              <span className="tn-breadcrumb-sep">/</span>
              <span className="tn-breadcrumb-name">{breadcrumb}</span>
            </div>
          )}
        </div>

        <div className="tn-right">
          {user ? (
            <>
              <button className="tn-acct" onClick={() => { setAcctOpen(v => !v); setToolsOpen(false); }}>
                <span className="tn-acct-dot"/>
                <span className="tn-acct-email">{(user.email || "Account").split("@")[0]}</span>
                <span className="tn-acct-chev">{acctOpen ? "▴" : "▾"}</span>
              </button>
              {acctOpen && (
                <div className="tn-acct-menu">
                  <div className="tn-acct-menu-email">{user.email}</div>
                  <button className="tn-acct-menu-item" onClick={go("/dashboard")}>📋 Dashboard</button>
                  <button className="tn-acct-menu-item" onClick={go("/pipeline")}>📈 Pipeline</button>
                  <button className="tn-acct-menu-item" onClick={go("/pricing")}>⭐ Pricing</button>
                  <div className="tn-acct-menu-divider"/>
                  <button className="tn-acct-menu-item" onClick={() => {
                    setAcctOpen(false);
                    if (location.pathname !== "/analyze") navigate("/analyze");
                    // Defer so OnboardingTour on /analyze has mounted before the event fires
                    setTimeout(() => window.dispatchEvent(new CustomEvent("rde:start-tour")), 300);
                  }}>🧭 Take the tour</button>
                  <div className="tn-acct-menu-divider"/>
                  <button className="tn-acct-menu-item danger" onClick={() => { setAcctOpen(false); signOut?.(); navigate("/"); }}>
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button className="tn-link" onClick={go("/login")}>Log in</button>
              <button className="tn-cta" onClick={go("/login")}>Start free →</button>
            </>
          )}
        </div>

        {/* Mega-menu — full-width row below nav */}
        {toolsOpen && (
          <div className="tn-mega" onMouseLeave={() => setToolsOpen(false)}>
            {TOOLS.map(cat => (
              <div key={cat.cat} className="tn-mega-cat">
                <div className="tn-mega-cat-h" style={{ color: cat.color }}>
                  ▸ {cat.cat}
                  <span className="tn-mega-cat-n">· {cat.tools.length}</span>
                </div>
                {cat.tools.map(t => {
                  const active = location.pathname === t.route;
                  return (
                    <button
                      key={t.route}
                      className={`tn-mega-tool ${active ? "active" : ""}`}
                      style={active ? { borderLeftColor: cat.color, color: cat.color } : undefined}
                      onMouseEnter={() => preloadRoute(t.route)}
                      onFocus={() => preloadRoute(t.route)}
                      onClick={go(t.route)}
                    >
                      <span className="tn-mega-tool-icon">{t.icon}</span>
                      <span className="tn-mega-tool-name">{t.name}</span>
                      {active && <span className="tn-mega-tool-here">HERE</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}

const css = `
.tn-nav{
  position:sticky; top:0; z-index:9100;
  height:52px;
  display:flex; align-items:center; gap:14px;
  padding:0 20px;
  background:rgba(7,9,15,0.92);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--borderf, rgba(255,255,255,0.07));
  font-family:'Geist',sans-serif;
}

.tn-logo{
  font-size:15px; font-weight:800; color:var(--text); text-decoration:none;
  letter-spacing:-0.2px; flex-shrink:0;
}
.tn-logo span{ color:var(--blue); }

.tn-center{ display:flex; align-items:center; gap:12px; flex:1; min-width:0; }

.tn-tools-btn{
  display:flex; align-items:center; gap:8px;
  padding:7px 14px;
  background:transparent;
  border:1px solid var(--borderf);
  border-radius:5px;
  color:var(--text);
  font-family:'Geist',sans-serif;
  font-size:13px; font-weight:700;
  letter-spacing:-0.1px;
  cursor:pointer;
  transition:border-color 0.15s, background 0.15s;
}
.tn-tools-btn:hover, .tn-tools-btn.open{
  border-color:var(--blue);
  background:rgba(59,158,255,0.07);
  color:var(--blue);
}
.tn-tools-dot{
  width:6px; height:6px; border-radius:50%;
  background:var(--green); box-shadow:0 0 6px var(--green);
}
.tn-tools-chev{ font-size:9px; color:var(--sub); }
.tn-tools-btn:hover .tn-tools-chev, .tn-tools-btn.open .tn-tools-chev{ color:var(--blue); }

.tn-breadcrumb{
  display:flex; align-items:center; gap:8px;
  min-width:0; overflow:hidden;
}
.tn-breadcrumb-sep{
  color:var(--dim); font-family:'Geist Mono',ui-monospace,monospace; font-size:13px;
}
.tn-breadcrumb-name{
  color:var(--sub); font-size:13px; font-weight:600;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.tn-right{ display:flex; align-items:center; gap:8px; position:relative; }

.tn-link{
  background:transparent; border:none;
  color:var(--sub); font-family:'Geist',sans-serif; font-size:13px; font-weight:600;
  padding:7px 10px; cursor:pointer; border-radius:5px;
  transition:color 0.15s, background 0.15s;
}
.tn-link:hover{ color:var(--text); background:rgba(255,255,255,0.04); }

.tn-cta{
  background:var(--blue); border:none; color:#fff;
  font-family:'Geist',sans-serif; font-size:13px; font-weight:700;
  padding:7px 16px; border-radius:5px; cursor:pointer;
  transition:transform 0.15s, box-shadow 0.15s;
}
.tn-cta:hover{ transform:translateY(-1px); box-shadow:0 6px 18px rgba(59,158,255,0.4); }

.tn-acct{
  display:flex; align-items:center; gap:8px;
  background:transparent;
  border:1px solid var(--borderf);
  color:var(--text);
  font-family:'Geist',sans-serif; font-size:13px; font-weight:600;
  padding:6px 12px; border-radius:5px; cursor:pointer;
  max-width:200px;
}
.tn-acct:hover{ border-color:var(--border); }
.tn-acct-dot{
  width:6px; height:6px; border-radius:50%;
  background:var(--green); box-shadow:0 0 6px var(--green); flex-shrink:0;
}
.tn-acct-email{
  font-size:12.5px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px;
}
.tn-acct-chev{ font-size:9px; color:var(--sub); }

.tn-acct-menu{
  position:absolute; top:calc(100% + 6px); right:0;
  background:var(--card); border:1px solid var(--borderf); border-radius:6px;
  padding:6px; min-width:200px;
  box-shadow:0 18px 48px rgba(0,0,0,0.55);
  display:flex; flex-direction:column; gap:1px;
}
.tn-acct-menu-email{
  padding:8px 10px 6px; font-size:11px; color:var(--dim);
  border-bottom:1px solid var(--borderf); margin-bottom:4px;
  font-family:'Geist Mono',ui-monospace,monospace;
  overflow:hidden; text-overflow:ellipsis;
}
.tn-acct-menu-item{
  display:block; width:100%; text-align:left;
  background:transparent; border:none;
  padding:8px 10px;
  color:var(--text); font-family:'Geist',sans-serif; font-size:13px;
  border-radius:4px; cursor:pointer;
}
.tn-acct-menu-item:hover{ background:rgba(255,255,255,0.04); }
.tn-acct-menu-item.danger{ color:var(--red); }
.tn-acct-menu-divider{ height:1px; background:var(--borderf); margin:4px 0; }

/* ── Mega-menu ── */
.tn-mega{
  position:absolute; top:100%; left:0; right:0;
  background:rgba(13,17,25,0.97);
  backdrop-filter:blur(24px);
  -webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid var(--borderf);
  border-top:1px solid var(--borderf);
  padding:22px 24px 26px;
  display:grid; grid-template-columns:repeat(5, 1fr); gap:24px;
  box-shadow:0 28px 60px rgba(0,0,0,0.7);
  max-width:1320px; margin:0 auto;
  animation:tn-mega-in 0.16s ease;
}
@keyframes tn-mega-in{ from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

.tn-mega-cat{ display:flex; flex-direction:column; gap:4px; min-width:0; }
.tn-mega-cat-h{
  font-family:'Geist Mono',ui-monospace,monospace; font-size:10px; font-weight:700;
  letter-spacing:1.6px; text-transform:uppercase;
  padding-bottom:8px; margin-bottom:4px;
  border-bottom:1px solid var(--borderf);
  display:flex; align-items:center; gap:6px;
}
.tn-mega-cat-n{ font-size:9px; color:var(--dim); font-weight:500; letter-spacing:0.4px; }

.tn-mega-tool{
  display:flex; align-items:center; gap:9px;
  padding:7px 9px;
  background:transparent;
  border:none;
  border-left:2px solid transparent;
  border-radius:4px;
  color:var(--sub);
  font-family:'Geist',sans-serif; font-size:13px; font-weight:600;
  cursor:pointer; text-align:left;
  transition:color 0.12s, background 0.12s, border-color 0.12s;
}
.tn-mega-tool:hover{ background:rgba(255,255,255,0.025); color:var(--text); }
.tn-mega-tool.active{
  background:rgba(255,255,255,0.03);
  font-weight:700;
}
.tn-mega-tool-icon{ font-size:16px; line-height:1; }
.tn-mega-tool-name{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tn-mega-tool-here{
  font-family:'Geist Mono',ui-monospace,monospace; font-size:8.5px; font-weight:700;
  border:1px solid currentColor; border-radius:2px;
  padding:1px 5px; letter-spacing:0.6px;
}

/* ── Responsive ── */
@media(max-width:760px){
  .tn-nav{ padding:0 12px; gap:8px; }
  .tn-breadcrumb{ display:none; }
  .tn-acct-email{ max-width:80px; }
  .tn-tools-btn{ padding:7px 11px; }
  .tn-mega{
    grid-template-columns:1fr 1fr;
    padding:18px 14px;
    gap:16px;
    max-height:calc(100vh - 52px);
    overflow-y:auto;
  }
  .tn-link{ display:none; }
}
@media(max-width:480px){
  .tn-mega{ grid-template-columns:1fr; }
}
`;
