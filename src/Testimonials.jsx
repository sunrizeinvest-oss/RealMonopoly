import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { TESTIMONIALS, TESTIMONIAL_CATEGORIES } from "./lib/testimonials";
import { bookingHref } from "./lib/booking";

/**
 * Testimonials — /testimonials public wall of customer + backer quotes.
 *
 * Empty state now, powerful when populated. Same lit-up-as-content-lands
 * pattern as /pitch/backers. Category filter (broker / investor / firm /
 * backer / partner) so visitors can slice by their own role.
 */
export default function Testimonials() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  useDocMeta({
    title: "Testimonials · RizeAI — What customers say",
    description: "Real quotes from Canadian brokers, agents, investors, and firm principals using RizeAI to underwrite deals.",
  });

  useEffect(() => { track("testimonials_view"); }, []);

  const filtered = filter === "all" ? TESTIMONIALS : TESTIMONIALS.filter(t => t.category === filter);
  const isEmpty = filtered.length === 0;

  return (
    <div className="tm-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="tm-body">
        {/* HEADER */}
        <div className="tm-header">
          <div className="tm-eyebrow">
            <span className="tm-eyebrow-dot" />
            REAL QUOTES · NAMED CUSTOMERS
          </div>
          <h1 className="tm-h1">
            {TESTIMONIALS.length === 0 ? (
              <>The wall goes up <span>as quotes land.</span></>
            ) : (
              <>What the room <span>already says.</span></>
            )}
          </h1>
          <p className="tm-sub">
            {TESTIMONIALS.length === 0
              ? "Real named customers opt in as the product finds them. Every quote here is verified — first + last name, firm, role, and (where available) profile link. Composite illustrations live at /case-studies until real customer names arrive."
              : `${TESTIMONIALS.length} verified quotes from ${new Set(TESTIMONIALS.map(t => t.category)).size} categories. Every one first + last name, firm, and role.`}
          </p>
        </div>

        {/* FILTER */}
        {TESTIMONIALS.length > 0 && (
          <div className="tm-filter-row">
            {TESTIMONIAL_CATEGORIES.map(c => (
              <button
                key={c.key}
                className={`tm-filter ${filter === c.key ? "active" : ""}`}
                onClick={() => setFilter(c.key)}
              >
                {c.label} ({c.key === "all" ? TESTIMONIALS.length : TESTIMONIALS.filter(t => t.category === c.key).length})
              </button>
            ))}
          </div>
        )}

        {/* CONTENT */}
        {isEmpty ? (
          <div className="tm-empty">
            <div className="tm-empty-icon">🪞</div>
            <div className="tm-empty-h">This wall is scaffolded, not fake.</div>
            <p className="tm-empty-p">
              Building an empty testimonial wall + filling it as real customers arrive is more honest than posting stock-photo "reviews." RizeAI has real users but customer testimonials require signed permission — coming as they opt in. Meanwhile: composite case studies at <a onClick={() => navigate("/case-studies")} className="tm-link">/case-studies</a> show the same value pattern.
            </p>
            <div className="tm-empty-cta">
              <button className="tm-cta" onClick={() => navigate("/case-studies")}>See composite case studies →</button>
              <button className="tm-cta ghost" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>Try the product</button>
            </div>
          </div>
        ) : (
          <div className="tm-grid">
            {filtered.map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        )}

        {/* SHARE-YOUR-STORY */}
        <div className="tm-share">
          <div className="tm-share-tag">▸ ALREADY A CUSTOMER?</div>
          <div className="tm-share-h">Send us a quote. Land on this wall.</div>
          <p className="tm-share-p">If RizeAI has helped you close a deal, spot an opportunity, or save analysis time, we'd love to publish your quote (with your permission and firm approval). Reply below with your permission + quote and it lands within 48h.</p>
          <div className="tm-share-cta">
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Customer%20Testimonial%20Permission&body=Name:%0AFirm:%0ARole:%0AQuote:" className="tm-cta">Send a quote →</a>
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="tm-cta ghost">Book a call instead</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t }) {
  return (
    <div className={`tm-card cat-${t.category}`}>
      <div className="tm-card-mark">"</div>
      <div className="tm-card-quote">{t.quote}</div>
      <div className="tm-card-attrib">
        <div className="tm-card-avatar">{t.name.split(" ").map(x => x[0]).join("").slice(0,2)}</div>
        <div>
          <div className="tm-card-name">
            {t.name}
            {t.verified && <span className="tm-verified" title="Verified quote">✓</span>}
          </div>
          <div className="tm-card-role">{t.role}{t.firm ? ` · ${t.firm}` : ""}</div>
          {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="tm-card-link">Profile →</a>}
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .tm-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .tm-body { max-width: 1040px; margin: 0 auto; padding: 44px 24px 80px; }

  .tm-header { text-align: center; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .tm-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .tm-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .tm-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .tm-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .tm-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 700px; margin: 0 auto; }

  .tm-filter-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px; }
  .tm-filter { padding: 6px 14px; border-radius: 20px; background: var(--card); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); letter-spacing: 0.3px; cursor: pointer; }
  .tm-filter:hover { color: var(--text); border-color: var(--sub); }
  .tm-filter.active { color: var(--brass); border-color: var(--brass); background: rgba(212,175,55,0.06); }

  .tm-empty { padding: 60px 32px; text-align: center; background: var(--card); border: 1px dashed rgba(212,175,55,0.30); border-radius: 12px; }
  .tm-empty-icon { font-size: 56px; margin-bottom: 14px; }
  .tm-empty-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 10px; }
  .tm-empty-p { font-size: 14.5px; color: var(--sub); line-height: 1.7; max-width: 620px; margin: 0 auto 22px; }
  .tm-empty-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .tm-link { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; }

  .tm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:900px){ .tm-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:560px){ .tm-grid { grid-template-columns: 1fr; } }

  .tm-card { position: relative; padding: 22px 22px 18px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; }
  .tm-card.cat-broker { border-left-color: var(--brass); }
  .tm-card.cat-investor { border-left-color: var(--royal); }
  .tm-card.cat-firm { border-left-color: #16a34a; }
  .tm-card.cat-backer { border-left-color: #a855f7; }
  .tm-card.cat-partner { border-left-color: #eab308; }
  .tm-card-mark { position: absolute; top: 8px; right: 14px; font-family: 'Geist Mono', monospace; font-size: 42px; font-weight: 800; color: var(--brass); opacity: 0.4; line-height: 1; }
  .tm-card-quote { font-size: 14px; color: var(--text); line-height: 1.7; font-style: italic; margin-bottom: 18px; padding-right: 20px; }
  .tm-card-attrib { display: flex; gap: 10px; align-items: center; padding-top: 12px; border-top: 1px dashed var(--borderf); }
  .tm-card-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; flex-shrink: 0; }
  .tm-card-name { font-size: 13.5px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; margin-bottom: 2px; display: flex; align-items: center; gap: 5px; }
  .tm-verified { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: #16a34a; color: #fff; font-size: 9px; font-weight: 800; }
  .tm-card-role { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 600; color: var(--sub); letter-spacing: 0.3px; }
  .tm-card-link { display: inline-block; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); text-decoration: none; letter-spacing: 0.3px; margin-top: 4px; }

  .tm-share { padding: 30px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 34px; }
  .tm-share-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .tm-share-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .tm-share-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; max-width: 560px; margin: 0 auto 18px; }
  .tm-share-cta { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .tm-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .tm-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .tm-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
