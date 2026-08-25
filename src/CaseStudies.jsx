import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";
import { CASE_STUDIES } from "./data/caseStudies";

/**
 * CaseStudies — /case-studies index page.
 *
 * Lists 3 realistic composite case studies. Each links to a detail page at
 * /case-studies/:slug. All flagged "Composite illustration" for legal
 * cleanliness until real broker customers replace them.
 */
export default function CaseStudies() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Case Studies · RizeAI",
    description: "How Canadian brokers use RizeAI to underwrite deals in seconds — Calgary R-CG fourplex, Toronto RD multiplex, Edmonton RS 8-unit builds.",
    // Falls back to og-image.png site default until per-page image ships.
    // image: "https://www.realdealestate.app/og-case-studies.png",
    jsonld: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "RizeAI Case Studies",
      "description": "Composite case studies showing how Canadian brokers use RizeAI to underwrite BRRRR, multiplex, and fix-and-flip deals in 3 seconds.",
      "url": "https://www.realdealestate.app/case-studies",
    },
  });

  return (
    <div className="cs-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="cs-body">
        <div className="cs-header">
          <div className="cs-eyebrow">
            <span className="cs-eyebrow-dot" />
            RIZEAI IN THE WILD
          </div>
          <h1 className="cs-h1">
            How Canadian brokers underwrite <span>with RizeAI.</span>
          </h1>
          <p className="cs-sub">
            Composite case studies drawn from real Canadian markets and current zoning bylaws.
            Numbers are illustrative until we publish signed testimonials from named brokers.
          </p>
        </div>

        <div className="cs-grid">
          {CASE_STUDIES.map(cs => (
            <div key={cs.slug} className="cs-card" onClick={() => navigate(`/case-studies/${cs.slug}`)}>
              <div className="cs-card-icon">{cs.icon}</div>
              <div className="cs-card-tag">
                ▸ {cs.city.toUpperCase()} · {cs.dealType.toUpperCase()}
              </div>
              <div className="cs-card-h">{cs.title}</div>
              <div className="cs-card-sub">{cs.subtitle}</div>

              <div className="cs-card-verdicts">
                {cs.verdicts.map((v, i) => (
                  <div key={i} className="cs-mini-verdict" style={{ borderLeftColor: v.color }}>
                    <div className="cs-mini-name">{v.name}</div>
                    <div className="cs-mini-verdict-pill" style={{ background: v.color }}>{v.label}</div>
                  </div>
                ))}
              </div>

              <div className="cs-card-foot">
                <span className="cs-card-broker">{cs.broker.name}</span>
                <span className="cs-card-arrow">Read full →</span>
              </div>
              {cs.isComposite && (
                <div className="cs-card-composite">◆ Composite illustration</div>
              )}
            </div>
          ))}
        </div>

        <div className="cs-cta-row">
          <button className="cs-cta" onClick={() => navigate("/property")}>
            Try RizeAI on your own address →
          </button>
          <button className="cs-cta ghost" onClick={() => navigate("/vs-biggerpockets")}>
            vs BiggerPockets
          </button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .cs-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .cs-body { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }

  .cs-header { text-align: center; margin-bottom: 44px; max-width: 780px; margin-left: auto; margin-right: auto; }
  .cs-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .cs-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .cs-h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--text); letter-spacing: -1.5px; line-height: 1.1; margin: 0 0 14px; }
  .cs-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .cs-sub { font-size: 15px; color: var(--sub); line-height: 1.65; margin: 0; }

  .cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
  @media (max-width: 900px) { .cs-grid { grid-template-columns: 1fr; } }

  .cs-card { display: flex; flex-direction: column; padding: 26px 22px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; cursor: pointer; transition: border-color 160ms, transform 160ms, box-shadow 220ms; position: relative; overflow: hidden; }
  .cs-card:hover { border-color: var(--brass); transform: translateY(-4px); box-shadow: 0 24px 48px -16px rgba(212,175,55,0.25); }

  .cs-card-icon { font-size: 40px; margin-bottom: 10px; line-height: 1; }
  .cs-card-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: var(--brass-2); margin-bottom: 12px; }
  .cs-card-h { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; line-height: 1.25; margin-bottom: 8px; }
  .cs-card-sub { font-size: 13px; color: var(--sub); line-height: 1.5; margin-bottom: 16px; flex: 1; }

  .cs-card-verdicts { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px dashed var(--borderf); }
  .cs-mini-verdict { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(15,23,42,0.03); border-left: 3px solid; border-radius: 4px; }
  .cs-mini-name { font-size: 11.5px; font-weight: 700; color: var(--text); font-family: 'Geist Mono', monospace; letter-spacing: 0.3px; }
  .cs-mini-verdict-pill { padding: 2px 7px; border-radius: 3px; font-family: 'Geist Mono', monospace; font-size: 9px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }

  .cs-card-foot { display: flex; justify-content: space-between; align-items: center; }
  .cs-card-broker { font-size: 11.5px; color: var(--sub); font-style: italic; }
  .cs-card-arrow { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: var(--brass-2); letter-spacing: 0.5px; }

  .cs-card-composite { position: absolute; top: 12px; right: 12px; font-family: 'Geist Mono', monospace; font-size: 9px; font-weight: 700; color: var(--dim); letter-spacing: 0.5px; }

  .cs-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 32px; }
  .cs-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .cs-cta:hover { transform: translateY(-2px); }
  .cs-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .cs-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
