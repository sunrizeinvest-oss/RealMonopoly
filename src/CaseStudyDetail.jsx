import { useParams, useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";
import { findCaseStudy } from "./data/caseStudies";

/**
 * CaseStudyDetail — /case-studies/:slug detail page.
 *
 * Full case study with property snapshot, 4-verdict grid, narrative sections
 * (context / insight / result / next steps), metrics callouts, and a
 * "Try this workflow yourself" CTA that deep-links into /property with the
 * demo address pre-filled.
 */
export default function CaseStudyDetail() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const cs = findCaseStudy(slug);

  useDocMeta({
    title: cs ? `${cs.title} · Case Study · RizeAI` : "Case Study · RizeAI",
    description: cs ? cs.subtitle : "How Canadian brokers underwrite with RizeAI.",
    // Per-case-study OG images ship as og-case-<slug>.png (1200×630). Until then
    // undefined means useDocMeta falls back to the site default (og-image.png).
    image: undefined,
    jsonld: cs ? {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": cs.title,
      "description": cs.subtitle,
      "articleSection": `${cs.city}, ${cs.province} · ${cs.dealType}`,
      "publisher": { "@type": "Organization", "name": "RizeAI", "url": "https://www.realdealestate.app" },
      "mainEntityOfPage": `https://www.realdealestate.app/case-studies/${cs.slug}`,
    } : undefined,
  });

  if (!cs) {
    return (
      <div className="csd-wrap">
        <style>{CSS}</style>
        <TopNav />
        <div className="csd-notfound">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div className="csd-notfound-h">Case study not found.</div>
          <button className="csd-cta" onClick={() => navigate("/case-studies")}>See all case studies →</button>
        </div>
      </div>
    );
  }

  const fmt$ = (n) => n ? `$${Math.round(n).toLocaleString()}` : "—";
  const fmtSqft = (n) => n ? `${n.toLocaleString()} sqft` : "—";

  const runDemo = () => {
    const url = `/property?addr=${encodeURIComponent(cs.demoAddress)}`;
    navigate(url);
  };

  return (
    <div className="csd-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="csd-body">
        {/* Breadcrumb */}
        <div className="csd-crumb">
          <span onClick={() => navigate("/case-studies")}>Case studies</span>
          <span> / </span>
          <span>{cs.city}</span>
        </div>

        {/* Hero */}
        <div className="csd-hero">
          <div className="csd-hero-icon">{cs.icon}</div>
          <div className="csd-hero-tag">
            ▸ {cs.city.toUpperCase()} · {cs.dealType.toUpperCase()}
          </div>
          <h1 className="csd-h1">{cs.title}</h1>
          <p className="csd-hero-sub">{cs.subtitle}</p>
          <div className="csd-broker">
            <div className="csd-broker-avatar">{cs.broker.name.charAt(0)}</div>
            <div>
              <div className="csd-broker-name">{cs.broker.name}</div>
              <div className="csd-broker-meta">{cs.broker.role} · {cs.broker.years} years · {cs.broker.firm}</div>
            </div>
          </div>
        </div>

        {/* Property snapshot */}
        <section className="csd-section">
          <div className="csd-section-eyebrow">▸ THE PROPERTY</div>
          <div className="csd-property-strip">
            <PropertyFact lbl="Address"  val={cs.property.address} />
            <PropertyFact lbl="City"     val={cs.property.city} />
            <PropertyFact lbl="Ask"      val={fmt$(cs.property.askingPrice)} />
            <PropertyFact lbl="Sqft"     val={fmtSqft(cs.property.sqft)} />
            <PropertyFact lbl="Beds/Baths" val={`${cs.property.beds}/${cs.property.baths}`} />
            <PropertyFact lbl="Zoning"   val={cs.property.zoning} />
            <PropertyFact lbl="Lot"      val={fmtSqft(cs.property.lotSqft)} />
            <PropertyFact lbl="Year"     val={cs.property.yearBuilt} />
          </div>
        </section>

        {/* Verdict grid — same shape as /property */}
        <section className="csd-section">
          <div className="csd-section-eyebrow">▸ RIZEAI FOUR-STRATEGY VERDICT</div>
          <p className="csd-p">Same verdict grid the broker saw on <code>/property</code>. Generated in ~3 seconds against the current CMHC anchor + city zoning bylaws.</p>
          <div className="csd-verdict-grid">
            {cs.verdicts.map((v, i) => (
              <div key={i} className="csd-verdict">
                <div className="csd-verdict-head">
                  <div className="csd-verdict-name">{v.name}</div>
                  <div className="csd-verdict-pill" style={{ background: v.color }}>{v.label}</div>
                </div>
                <div className="csd-verdict-headline" style={{ color: v.color }}>{v.headline}</div>
                <div className="csd-verdict-sub">{v.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Narrative — 4 sections */}
        <section className="csd-section">
          <div className="csd-section-eyebrow">▸ THE STORY</div>

          <div className="csd-narrative-block">
            <div className="csd-narrative-h">Context</div>
            <p className="csd-p">{cs.narrative.context}</p>
          </div>

          <div className="csd-narrative-block">
            <div className="csd-narrative-h">The Insight</div>
            <p className="csd-p">{cs.narrative.insight}</p>
          </div>

          <div className="csd-narrative-block">
            <div className="csd-narrative-h">The Result</div>
            <p className="csd-p">{cs.narrative.result}</p>
          </div>

          <div className="csd-narrative-block">
            <div className="csd-narrative-h">Next Steps</div>
            <ul className="csd-list">
              {cs.narrative.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ul>
          </div>
        </section>

        {/* Metrics */}
        <section className="csd-section">
          <div className="csd-section-eyebrow">▸ THE NUMBERS</div>
          <div className="csd-metrics-grid">
            {Object.entries(cs.metrics).map(([k, v]) => (
              <div key={k} className="csd-metric">
                <div className="csd-metric-lbl">{camelToLabel(k)}</div>
                <div className="csd-metric-val">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="csd-cta-block">
          <div className="csd-cta-h">Try this workflow yourself.</div>
          <p className="csd-cta-p">
            One click loads the same address into RizeAI. Same verdict grid. Same numbers. Your first 5 lookups are free.
          </p>
          <div className="csd-cta-row">
            <button className="csd-cta" onClick={runDemo}>
              Load {cs.property.address} in RizeAI →
            </button>
            <button className="csd-cta ghost" onClick={() => navigate("/case-studies")}>
              See other case studies
            </button>
          </div>
        </div>

        {cs.isComposite && (
          <div className="csd-composite">
            ◆ Composite illustration — numbers and narrative drawn from real Canadian markets and current bylaws. Broker name replaced. Will be swapped for signed named case study when RizeAI has published customer testimonials.
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyFact({ lbl, val }) {
  return (
    <div className="csd-property-fact">
      <div className="csd-property-lbl">{lbl}</div>
      <div className="csd-property-val">{val}</div>
    </div>
  );
}

function camelToLabel(s) {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

const CSS = `
  .csd-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .csd-body { max-width: 900px; margin: 0 auto; padding: 32px 24px 80px; }

  .csd-notfound { text-align: center; padding: 80px 20px; }
  .csd-notfound-h { font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 20px; }

  .csd-crumb { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); margin-bottom: 18px; letter-spacing: 0.4px; }
  .csd-crumb span:first-child { color: var(--brass-2); cursor: pointer; text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  .csd-hero { text-align: center; margin-bottom: 44px; padding: 32px 24px; background: linear-gradient(180deg, rgba(212,175,55,0.05), transparent); border: 1px solid rgba(212,175,55,0.24); border-radius: 12px; }
  .csd-hero-icon { font-size: 56px; margin-bottom: 12px; line-height: 1; }
  .csd-hero-tag { display: inline-block; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.6px; margin-bottom: 14px; padding: 5px 12px; background: rgba(212,175,55,0.10); border: 1px solid rgba(212,175,55,0.28); border-radius: 4px; }
  .csd-h1 { font-size: clamp(24px, 3.5vw, 34px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.2; margin: 0 auto 12px; max-width: 720px; }
  .csd-hero-sub { font-size: 15px; color: var(--sub); line-height: 1.55; margin: 0 auto 22px; max-width: 640px; }
  .csd-broker { display: inline-flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); border-radius: 8px; }
  .csd-broker-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 15px; font-weight: 800; }
  .csd-broker-name { font-size: 13px; font-weight: 800; color: var(--text); text-align: left; }
  .csd-broker-meta { font-size: 11px; color: var(--sub); font-family: 'Geist Mono', monospace; letter-spacing: 0.3px; margin-top: 2px; }

  .csd-section { margin-bottom: 36px; padding-bottom: 26px; border-bottom: 1px solid var(--borderf); }
  .csd-section:last-of-type { border-bottom: none; }
  .csd-section-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 14px; }
  .csd-p { font-size: 14.5px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .csd-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.05); padding: 2px 6px; border-radius: 3px; font-size: 12.5px; color: var(--brass-2); }

  .csd-property-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 640px) { .csd-property-strip { grid-template-columns: repeat(2, 1fr); } }
  .csd-property-fact { padding: 10px 12px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .csd-property-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; color: var(--sub); text-transform: uppercase; margin-bottom: 4px; }
  .csd-property-val { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }

  .csd-verdict-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
  @media (max-width: 720px) { .csd-verdict-grid { grid-template-columns: repeat(2, 1fr); } }
  .csd-verdict { padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .csd-verdict-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .csd-verdict-name { font-size: 12.5px; font-weight: 800; color: var(--text); }
  .csd-verdict-pill { padding: 3px 8px; border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800; color: #fff; letter-spacing: 0.6px; }
  .csd-verdict-headline { font-family: 'Geist Mono', monospace; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
  .csd-verdict-sub { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); }

  .csd-narrative-block { margin-bottom: 18px; padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .csd-narrative-h { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 10px; }

  .csd-list { list-style: none; padding: 0; margin: 0; }
  .csd-list li { padding: 8px 0 8px 20px; position: relative; font-size: 14px; color: var(--text); line-height: 1.6; border-bottom: 1px dashed var(--borderf); }
  .csd-list li:last-child { border-bottom: none; }
  .csd-list li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-family: 'Geist Mono', monospace; font-weight: 800; }

  .csd-metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media (max-width: 640px) { .csd-metrics-grid { grid-template-columns: 1fr; } }
  .csd-metric { padding: 16px 18px; background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.24); border-radius: 8px; }
  .csd-metric-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 6px; }
  .csd-metric-val { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }

  .csd-cta-block { padding: 36px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-bottom: 24px; }
  .csd-cta-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .csd-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin: 0 auto 20px; max-width: 520px; }
  .csd-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .csd-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .csd-cta:hover { transform: translateY(-2px); }
  .csd-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }

  .csd-composite { padding: 12px 14px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); border-radius: 6px; font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); line-height: 1.5; text-align: center; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
