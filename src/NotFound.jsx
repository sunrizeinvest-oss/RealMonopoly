/**
 * 404 page — branded catch-all that replaces the previous silent
 * `Navigate to="/" replace` redirect.
 *
 * Investors landing on a typo'd URL now get a professional dead-end
 * with helpful quick-links instead of being bounced back to the
 * landing page without explanation.
 *
 * Maintains the Family Office palette (navy + brass + alabaster).
 * No auth required.
 */

import { useNavigate, useLocation } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

export default function NotFound() {
  useDocMeta({
    title: "Not found · RizeAI",
    description: "The page you're looking for doesn't exist. Try the X-Ray bar on the landing page or search any Canadian address.",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const css = `
    .nf-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh;display:flex;flex-direction:column}
    body:has(.nf-page){background:#0a1128}

    .nf-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:48px 24px;position:relative;overflow:hidden}
    .nf-bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(33,85,205,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(33,85,205,0.04) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
    .nf-glow{position:absolute;top:20%;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse,rgba(212,175,55,0.08) 0%,transparent 65%);pointer-events:none;animation:nf-breathe 5s ease-in-out infinite}
    @keyframes nf-breathe{0%,100%{opacity:1}50%{opacity:0.55}}

    .nf-inner{max-width:680px;width:100%;position:relative;z-index:1;text-align:center}

    .nf-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;background:rgba(10,17,40,0.55);backdrop-filter:blur(10px);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px;margin-bottom:24px}
    .nf-dot{width:6px;height:6px;border-radius:50%;background:#d4af37;animation:nf-blink 2s infinite;box-shadow:0 0 8px #d4af37}
    @keyframes nf-blink{0%,100%{opacity:1}50%{opacity:0.2}}

    .nf-404{font-family:'Geist Mono',ui-monospace,monospace;font-size:clamp(80px,15vw,140px);font-weight:800;color:transparent;background:linear-gradient(180deg,#d4af37 0%,#b8941f 100%);-webkit-background-clip:text;background-clip:text;letter-spacing:-4px;line-height:1;margin-bottom:8px;text-shadow:0 12px 40px rgba(212,175,55,0.18)}

    .nf-h1{font-size:clamp(26px,3.5vw,38px);font-weight:800;color:#ffffff;letter-spacing:-1.2px;line-height:1.15;margin:0 0 16px}
    .nf-h1 span{color:#d4af37;font-style:italic;font-weight:700}

    .nf-sub{font-size:15.5px;color:#d4d8e0;line-height:1.7;margin:0 auto 14px;max-width:520px}
    .nf-attempted{display:inline-block;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;color:#94a3b8;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);padding:5px 10px;border-radius:3px;margin-top:6px;letter-spacing:0.2px;word-break:break-all}

    .nf-cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:36px}
    .nf-btn{background:#2155cd;color:#fff;border:1px solid #d4af37;border-radius:4px;padding:13px 24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s}
    .nf-btn:hover{background:#0047ab;transform:translateY(-1px);box-shadow:0 10px 28px rgba(212,175,55,0.25)}
    .nf-btn.secondary{background:transparent;border-color:rgba(212,175,55,0.4);color:#d4d8e0}
    .nf-btn.secondary:hover{border-color:#d4af37;color:#d4af37;background:rgba(212,175,55,0.06)}

    .nf-quicklinks{margin-top:48px;padding-top:32px;border-top:1px solid rgba(212,175,55,0.18)}
    .nf-quicklinks-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#94a3b8;margin-bottom:18px}
    .nf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:left}
    .nf-link{padding:14px 16px;background:rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.18);border-left:2px solid #d4af37;border-radius:4px;cursor:pointer;transition:all 0.15s}
    .nf-link:hover{background:rgba(212,175,55,0.08);transform:translateY(-1px)}
    .nf-link-title{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#d4af37;text-transform:uppercase;margin-bottom:4px}
    .nf-link-desc{font-size:12.5px;color:#d4d8e0;line-height:1.45}

    @media (max-width: 720px) {
      .nf-grid{grid-template-columns:1fr}
    }
  `;

  // Suggest the right destination based on what they tried to hit.
  // Cheap pattern matching against the path keeps the page useful for the
  // most common typos / dead links.
  const suggestion = (() => {
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("admin"))        return { route: "/admin",    label: "Admin dashboard" };
    if (p.includes("comm") || p.includes("multi") || p.includes("apartment"))
                                    return { route: "/commercial", label: "Commercial Underwriter" };
    if (p.includes("brrrr") || p.includes("rental"))
                                    return { route: "/brrrr",    label: "BRRRR Calculator" };
    if (p.includes("flip") || p.includes("rehab") || p.includes("app"))
                                    return { route: "/app",      label: "Fix & Flip Analyzer" };
    if (p.includes("portfolio"))    return { route: "/portfolio",label: "Portfolio Dashboard" };
    if (p.includes("pricing") || p.includes("plan") || p.includes("price"))
                                    return { route: "/pricing",  label: "Pricing" };
    if (p.includes("trigger") || p.includes("alert") || p.includes("market"))
                                    return { route: "/triggers", label: "Market Triggers" };
    if (p.includes("learn") || p.includes("blog") || p.includes("guide") || p.includes("doc"))
                                    return { route: "/learn",    label: "Education Hub" };
    if (p.includes("about") || p.includes("team") || p.includes("founder"))
                                    return { route: "/about",    label: "About RizeAI" };
    return null;
  })();

  return (
    <div className="nf-page">
      <style>{css}</style>
      <TopNav />
      <div className="nf-wrap">
        <div className="nf-bg-grid" />
        <div className="nf-glow" />
        <div className="nf-inner">
          <div className="nf-eyebrow">
            <span className="nf-dot" />
            ▸ Off-Market · Off-Route
          </div>
          <div className="nf-404">404</div>
          <h1 className="nf-h1">
            That address isn't in the <span>data set.</span>
          </h1>
          <p className="nf-sub">
            The page you tried to reach doesn't exist on RizeAI. The link may be
            outdated, a typo, or referring to a feature we haven't shipped yet.
          </p>
          {location.pathname && location.pathname !== "/" && (
            <div className="nf-attempted">
              you tried: {location.pathname}
            </div>
          )}

          {suggestion && (
            <p className="nf-sub" style={{marginTop:18}}>
              Looking for <strong style={{color:"#d4af37"}}>{suggestion.label}</strong>?
            </p>
          )}

          <div className="nf-cta-row">
            {suggestion ? (
              <>
                <button className="nf-btn" onClick={() => navigate(suggestion.route)}>
                  Go to {suggestion.label} →
                </button>
                <button className="nf-btn secondary" onClick={() => navigate("/")}>
                  Back to landing
                </button>
              </>
            ) : (
              <>
                <button className="nf-btn" onClick={() => navigate("/")}>
                  Back to landing
                </button>
                <button className="nf-btn secondary" onClick={() => navigate("/analyze")}>
                  Search a property
                </button>
              </>
            )}
          </div>

          <div className="nf-quicklinks">
            <div className="nf-quicklinks-lbl">▸ Most common destinations</div>
            <div className="nf-grid">
              <div className="nf-link" onClick={() => navigate("/")}>
                <div className="nf-link-title">▸ X-Ray bar</div>
                <div className="nf-link-desc">Type any Canadian address. 5-second institutional read.</div>
              </div>
              <div className="nf-link" onClick={() => navigate("/commercial")}>
                <div className="nf-link-title">▸ Commercial Underwriter</div>
                <div className="nf-link-desc">Multifamily underwriter + Loss-to-Lease parser.</div>
              </div>
              <div className="nf-link" onClick={() => navigate("/about")}>
                <div className="nf-link-title">▸ About</div>
                <div className="nf-link-desc">Why we exist + the operating principles.</div>
              </div>
              <div className="nf-link" onClick={() => navigate("/pricing")}>
                <div className="nf-link-title">▸ Pricing</div>
                <div className="nf-link-desc">$0 free · $99 Pro · $299 Scale. Stripe live.</div>
              </div>
              <div className="nf-link" onClick={() => navigate("/brrrr")}>
                <div className="nf-link-title">▸ BRRRR Calculator</div>
                <div className="nf-link-desc">Buy / Rehab / Rent / Refi / Repeat math.</div>
              </div>
              <div className="nf-link" onClick={() => navigate("/triggers")}>
                <div className="nf-link-title">▸ Market Triggers</div>
                <div className="nf-link-desc">Terminated / suspended listing radar.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
