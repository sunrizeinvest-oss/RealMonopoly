import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { bookingHref } from "./lib/booking";

/**
 * Founder — /founder the definitive founder-showcase surface.
 *
 * For a solo pre-seed founder, this is the URL you send when a VC asks
 * "who are you?" Everything on this page is designed to answer:
 *   1. Why THIS person for THIS problem
 *   2. What they've actually shipped (evidence of velocity)
 *   3. How they think (public writing, product decisions)
 *   4. Who vouches for them (testimonials scaffold)
 *   5. How to reach them (booking + email + social)
 */
export default function Founder() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Sunni Yaremchuk · Founder · RizeAI",
    description: "Sunni Yaremchuk is the founder and CEO of RizeAI — building the institutional underwriting layer for Canadian residential real estate.",
  });

  useEffect(() => { track("founder_page_view"); }, []);

  return (
    <div className="fp-wrap">
      <style>{CSS}</style>
      <TopNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="fp-hero">
        <div className="fp-hero-inner">
          <div className="fp-hero-photo">
            {/* Photo slot. Drop a 512×512 JPG at /public/founder-sunni.jpg
                to activate. Falls back to brass "S" avatar. */}
            <img
              src="/founder-sunni.jpg"
              alt="Sunni Yaremchuk"
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
            />
            <div className="fp-hero-avatar-fallback">S</div>
          </div>
          <div className="fp-hero-body">
            <div className="fp-hero-eyebrow">
              <span className="fp-hero-dot" />
              FOUNDER + CEO · RIZEAI
            </div>
            <h1 className="fp-hero-name">Sunni Yaremchuk</h1>
            <div className="fp-hero-tagline">
              Active Edmonton multifamily developer building the underwriting tool <span>every Canadian broker + investor</span> should have. Also Founder + CEO at <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer" style={{color:"var(--brass-2)"}}>Rize Developments</a>.
            </div>
            <div className="fp-hero-anchors">
              <div className="fp-anchor">▸ Founder + Principal Developer · Rize Developments (Edmonton multifamily)</div>
              <div className="fp-anchor">▸ 4 active infill projects · 28 doors under development</div>
              <div className="fp-anchor">▸ Based in Edmonton, AB · shipping RizeAI solo</div>
            </div>
            <div className="fp-hero-ctas">
              <a href={bookingHref()} target="_blank" rel="noreferrer" className="fp-cta" onClick={() => track("founder_book_click")}>
                Book a 20-min intro →
              </a>
              <a href="mailto:sunni@rizedevelopments.com?subject=Hi%20Sunni" className="fp-cta ghost">Email</a>
              <a href="https://www.linkedin.com/in/sunni-yaremchuk-9b1484222/" target="_blank" rel="noreferrer" className="fp-cta ghost">LinkedIn</a>
              <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer" className="fp-cta ghost">Rize Developments</a>
            </div>
          </div>
        </div>
      </section>

      <div className="fp-body">
        {/* ── BIO ────────────────────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ THE STORY</div>
          <h2 className="fp-h2">Operator first. Founder second.</h2>
          <div className="fp-bio">
            <p className="fp-p">
              I'm the founder and principal developer at <b>Rize Developments</b> — an Edmonton multifamily developer with 4 active infill projects underway: an 8-unit build in Jasper Park, two Allendale projects (5 units + 6 units), and a 9-unit rowhouse in Mayfield. Every one of those deals started with the same underwriting problem: existing tools don't ship the Edmonton bylaw math, don't anchor to CMHC rents at the metro level, and can't compare four strategies side-by-side.
            </p>
            <p className="fp-p">
              After Bylaw 20001 passed in 2024 — the reform that lets every RS lot in Edmonton support up to 8 units as-of-right — the underwriting complexity got worse, not better. Every RS corner lot is now a potential 8-plex. Nobody had a tool that could tell you which lots pencilled and which didn't. I was doing that math in Excel for my own deals; I built RizeAI so the next developer wouldn't have to.
            </p>
            <p className="fp-p">
              The intersection of active-multifamily-developer AND full-stack builder is roughly nobody in Canada. Most PropTech founders are technical people who studied the industry from the outside. I'm the reverse — an operator with real projects, real CMHC financing conversations, real municipal permit relationships, who happens to also ship production software. That's the edge: RizeAI is built by someone who <em>actually uses it every week</em> to close real deals.
            </p>
            <p className="fp-p">
              What happens if this works: every Canadian broker types every address through RizeAI before they pick up the phone. Every developer runs their lots through it before they submit an offer. Every firm subscribes to Scale tier to give their agents the same infrastructure the family offices already have. Then we expand to the US. I'm in for the 10 years it takes to get there.
            </p>
          </div>
        </section>

        {/* ── CREDIBILITY BAR ─────────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ CREDIBILITY ANCHORS</div>
          <div className="fp-cred-grid">
            <CredCell num="4" lbl="Active development projects" note="Rize Developments · Edmonton infill" />
            <CredCell num="28" lbl="Doors under development" note="8 + 5 + 6 + 9 across 4 projects" />
            <CredCell num="2" lbl="Companies I'm founder of" note="Rize Developments (2020+) · RizeAI (2026)" />
            <CredCell num="7" lbl="CA cities of RizeAI depth" note="Cal · Van · TO · Ott · Miss · Ham · Edm" />
          </div>
        </section>

        {/* ── ACTIVE PROJECTS · RIZE DEVELOPMENTS ─────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ WHAT I'M BUILDING AT RIZE DEVELOPMENTS (LITERAL BUILDINGS)</div>
          <h2 className="fp-h2">The operator side. Live projects.</h2>
          <p className="fp-p" style={{marginBottom:20}}>
            RizeAI didn't come from a whiteboard. It came from underwriting these exact deals in Excel. Every project below is real — you can find them at <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer" className="fp-inline">rizedevelopments.com</a>.
          </p>
          <div className="fp-projects">
            <ProjectCard
              name="Rize Jasper Park"
              address="9121 152 St · Jasper Park, Edmonton AB"
              units="8 units · red brick + stucco · arched windows"
              status="AVAILABLE"
            />
            <ProjectCard
              name="Allendale — 5 Units"
              address="6408 Allendale · Edmonton AB"
              units="3-storey infill · floor-to-ceiling glazing · cedar accents"
              status="IN DEVELOPMENT"
            />
            <ProjectCard
              name="Allendale — 6 Units"
              address="10646 61 Ave · Allendale, Edmonton AB"
              units="Semi-detached · dual gabled rooflines · separate entrances"
              status="IN DEVELOPMENT"
            />
            <ProjectCard
              name="Mayfield — 9 Units"
              address="Mayfield · Edmonton AB"
              units="9-unit rowhouse · modern gabled · 2-storey · basement dev potential"
              status="IN PLANNING"
            />
          </div>
        </section>

        {/* ── SHOWCASE · RIZEAI VELOCITY ──────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ WHAT I'VE SHIPPED (SOLO, IN PRODUCTION)</div>
          <h2 className="fp-h2">The evidence, not the pitch.</h2>
          <p className="fp-p">
            RizeAI is not a slide deck. Every artifact below is live in production, discoverable at the linked URL, built by me solo. Combined shipping window: <b>8 weeks</b>.
          </p>
          <div className="fp-showcase">
            <ShipCard
              tag="CORE PRODUCT"
              h="4-strategy verdict engine"
              desc="One address → BRRRR + Hold + Flip + Multiplex Build verdicts in ~3 seconds. Live in 7 CA cities."
              href="/property?addr=2424+Westmount+Rd+NW+Calgary+AB"
              cta="Try live demo →"
            />
            <ShipCard
              tag="DATA MOAT"
              h="37 hand-verified zoning codes"
              desc="Toronto RD 2023, Edmonton RS Bylaw 20001, Calgary R-CG. Municipal bylaw specs across 7 cities."
              href="/pitch/product-vault?p=rzai-insider-2026"
              cta="Feature deep-dive →"
            />
            <ShipCard
              tag="AI LAYER"
              h="Anthropic integration"
              desc="our AI routing. $0.001 marginal cost per verdict. 99.8% gross margin."
              href="/pitch/unit-economics?p=rzai-insider-2026"
              cta="Unit economics →"
            />
            <ShipCard
              tag="DISTRIBUTION"
              h="Chrome extension"
              desc="Realtor.ca + HouseSigma + Zillow + Redfin. Verdicts inline on any listing."
              href="/pitch/product-vault?p=rzai-insider-2026"
              cta="See it live →"
            />
            <ShipCard
              tag="PLATFORM"
              h="Public API v1"
              desc="REST API + authentication + rate limiting. Firm-tier customers embed in CRM."
              href="/api-docs"
              cta="API docs →"
            />
            <ShipCard
              tag="OPS"
              h="Weekly Buy Box digest"
              desc="Saved criteria + Monday 9am UTC cron + Resend transactional email. Passive deal flow."
              href="/buybox"
              cta="See Buy Box →"
            />
            <ShipCard
              tag="RAISE"
              h="40+ investor surfaces"
              desc="Deck, one-pager, unit economics, data room, timeline, backers, comps — all shipped."
              href="/pitch?p=rzai-insider-2026"
              cta="See pitch materials →"
            />
            <ShipCard
              tag="TRACTION"
              h="Live metrics dashboard"
              desc="Real-time counts from Supabase. Public dashboard for accountability."
              href="/live"
              cta="See live numbers →"
            />
          </div>
        </section>

        {/* ── THINKING IN PUBLIC ──────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ THINKING IN PUBLIC</div>
          <h2 className="fp-h2">Where I write, speak, and share the build.</h2>
          <div className="fp-public-grid">
            <PublicCard
              icon="✍"
              lbl="Writing"
              val="realdealestate.app/blog"
              desc="Canadian zoning bylaw analysis, deal walkthroughs, market updates."
              href="/blog"
            />
            <PublicCard
              icon="📬"
              lbl="Monthly updates"
              val="realdealestate.app/updates"
              desc="Public investor updates — metrics, wins, challenges, asks. First of every month."
              href="/updates"
            />
            <PublicCard
              icon="💼"
              lbl="LinkedIn"
              val="linkedin.com/in/sunni-yaremchuk-9b1484222"
              desc="Product updates, Rize Developments deals, broker outreach."
              href="https://www.linkedin.com/in/sunni-yaremchuk-9b1484222/"
              external
            />
            <PublicCard
              icon="🐦"
              lbl="X / Twitter"
              val="@sunni_yaremchuk"
              desc="Daily build-in-public. Screenshot-heavy. Broker + PropTech commentary."
              href="https://twitter.com/sunni_yaremchuk"
              external
            />
            <PublicCard
              icon="📖"
              lbl="Story"
              val="realdealestate.app/story"
              desc="The full origin narrative — why RizeAI, why me, why the underwriting layer."
              href="/story"
            />
            <PublicCard
              icon="🎯"
              lbl="Roadmap"
              val="realdealestate.app/roadmap"
              desc="Shipped features + 90-day roadmap + 12-month strategic bets. Public accountability."
              href="/roadmap"
            />
          </div>
        </section>

        {/* ── PRIOR WORK ──────────────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ COMPANIES I'VE FOUNDED</div>
          <h2 className="fp-h2">Two operating companies.</h2>
          <div className="fp-prior">
            <PriorRow
              year="Now"
              role="Founder + CEO · RizeAI"
              body="Institutional underwriting layer for Canadian residential real estate. Solo build shipping in production — 7 CA cities live, 37 zoning codes hand-verified, 40+ raise materials, Chrome extension, public API. 8-week shipping window from first commit to raise-open."
              current
            />
            <PriorRow
              year="2020 → now"
              role="Founder + Principal Developer · Rize Developments"
              body="Edmonton multifamily developer. 4 active infill projects (28 doors under development). Off-market land acquisition, design, construction, CMHC financing. Delivers luxury residential and mixed-use rental properties to qualified buyers. rizedevelopments.com."
            />
          </div>
        </section>

        {/* ── TESTIMONIALS ────────────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ WHAT PEOPLE SAY</div>
          <h2 className="fp-h2">Recommendations from people who've worked with me.</h2>
          <div className="fp-testi-empty">
            <div className="fp-testi-icon">🪞</div>
            <div className="fp-testi-h">Scaffolded, not fake.</div>
            <p className="fp-testi-p">
              Recommendations from prior colleagues + collaborators arrive on this page as they opt in. Rather than posting stock quotes, I'm collecting real named references and publishing them when granted. If we've worked together and you'd like to send a note, <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20founder%20reference" className="fp-inline">email me</a>.
            </p>
          </div>
        </section>

        {/* ── WHAT'S NEXT ─────────────────────────────────────────── */}
        <section className="fp-section">
          <div className="fp-section-tag">▸ NEXT 90 DAYS · IN FIRST PERSON</div>
          <h2 className="fp-h2">What I'm personally doing right now.</h2>
          <div className="fp-next">
            <NextItem
              week="This week"
              body="20 broker DMs/day on LinkedIn · 3 product walkthrough demos · pitch the raise to 5 warm-intro angels · record founder Loom."
            />
            <NextItem
              week="Weeks 2-4"
              body="Close first 5 paying Pro-tier brokers · convert first walkthrough to firm-tier Scale demo · publish first real customer case study replacing composite illustration."
            />
            <NextItem
              week="Weeks 5-8"
              body="Hire senior engineer + GTM Lead (both pre-identified) · ship US city adapter #1 (Seattle) · first close of pre-seed round targeted for mid-August."
            />
            <NextItem
              week="Weeks 9-12"
              body="10 paying brokers · $2K MRR · first firm-tier customer · Series-A introduction conversations open."
            />
          </div>
        </section>

        {/* ── CONTACT / CTA ────────────────────────────────────────── */}
        <div className="fp-cta-block">
          <div className="fp-cta-h">Let's talk.</div>
          <div className="fp-cta-p">Fastest path from "interested" to "in" — 20-min intro call on my calendar. Same booking widget I use with qualified Rize Developments partners. If we're not a fit, we won't waste each other's time. If we are, I close within 14 days.</div>
          <div className="fp-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="fp-cta big">Book 20-min intro →</a>
            <a href="mailto:sunni@rizedevelopments.com?subject=Hi%20Sunni" className="fp-cta ghost">sunni@rizedevelopments.com</a>
            <a href="tel:+15878440420" className="fp-cta ghost">(587) 844-0420</a>
            <button className="fp-cta ghost" onClick={() => navigate("/pitch")}>Full raise materials →</button>
          </div>
          <div className="fp-cta-foot">
            Edmonton, AB · Available on Zoom or in-person when I'm in Toronto, Calgary, Vancouver, or NYC · 24-hour email response window · Mon-Fri 8am-6pm MST
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card components ────────────────────────────────────────────────────
function CredCell({ num, lbl, note }) {
  return (
    <div className="fp-cred">
      <div className="fp-cred-num">{num}</div>
      <div className="fp-cred-lbl">{lbl}</div>
      <div className="fp-cred-note">{note}</div>
    </div>
  );
}

function ShipCard({ tag, h, desc, href, cta }) {
  const isExternal = href?.startsWith("http");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="fp-ship"
    >
      <div className="fp-ship-tag">{tag}</div>
      <div className="fp-ship-h">{h}</div>
      <div className="fp-ship-desc">{desc}</div>
      <div className="fp-ship-cta">{cta}</div>
    </a>
  );
}

function PublicCard({ icon, lbl, val, desc, href, external }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="fp-public"
    >
      <div className="fp-public-head">
        <span className="fp-public-icon">{icon}</span>
        <div>
          <div className="fp-public-lbl">{lbl}</div>
          <div className="fp-public-val">{val}</div>
        </div>
      </div>
      <div className="fp-public-desc">{desc}</div>
    </a>
  );
}

function PriorRow({ year, role, body, current }) {
  return (
    <div className={`fp-prior-row ${current ? "current" : ""}`}>
      <div className="fp-prior-year">{year}</div>
      <div className="fp-prior-body">
        <div className="fp-prior-role">{role}</div>
        <div className="fp-prior-desc">{body}</div>
      </div>
    </div>
  );
}

function ProjectCard({ name, address, units, status }) {
  const statusColor = {
    "AVAILABLE": { c: "#16a34a", bg: "rgba(22,163,74,0.10)", b: "rgba(22,163,74,0.30)" },
    "IN DEVELOPMENT": { c: "#eab308", bg: "rgba(234,179,8,0.10)", b: "rgba(234,179,8,0.30)" },
    "IN PLANNING": { c: "var(--royal)", bg: "rgba(33,85,205,0.08)", b: "rgba(33,85,205,0.28)" },
  }[status] || { c: "var(--sub)", bg: "rgba(148,163,184,0.10)", b: "var(--borderf)" };
  return (
    <div className="fp-project">
      <div className="fp-project-head">
        <div>
          <div className="fp-project-name">{name}</div>
          <div className="fp-project-address">{address}</div>
        </div>
        <span className="fp-project-status" style={{ color: statusColor.c, background: statusColor.bg, borderColor: statusColor.b }}>{status}</span>
      </div>
      <div className="fp-project-units">{units}</div>
    </div>
  );
}

function NextItem({ week, body }) {
  return (
    <div className="fp-next-item">
      <div className="fp-next-week">{week}</div>
      <div className="fp-next-body">{body}</div>
    </div>
  );
}

const CSS = `
  .fp-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }

  /* ── Hero ─────────────────────────────────────────────────────── */
  .fp-hero { padding: 56px 24px 44px; background: linear-gradient(180deg, rgba(212,175,55,0.05), rgba(10,17,40,0.04)); border-bottom: 1px solid var(--borderf); }
  .fp-hero-inner { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 220px 1fr; gap: 40px; align-items: center; }
  @media(max-width:720px){ .fp-hero-inner { grid-template-columns: 1fr; gap: 24px; text-align: center; } }

  .fp-hero-photo { position: relative; width: 220px; height: 220px; margin: 0 auto; }
  .fp-hero-photo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid var(--brass); box-shadow: 0 24px 60px -14px rgba(212,175,55,0.30); }
  .fp-hero-avatar-fallback { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; font-family: 'Geist Mono', monospace; font-size: 96px; font-weight: 800; box-shadow: 0 24px 60px -14px rgba(212,175,55,0.30); }
  .fp-hero-photo img[src=""], .fp-hero-photo img:not([src]) { display: none; }
  .fp-hero-photo img { display: block; }

  .fp-hero-body { min-width: 0; }
  .fp-hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .fp-hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .fp-hero-name { font-size: clamp(38px, 6vw, 62px); font-weight: 800; color: var(--text); letter-spacing: -2px; line-height: 1.05; margin: 0 0 12px; }
  .fp-hero-tagline { font-size: clamp(16px, 2.2vw, 22px); color: var(--sub); line-height: 1.55; margin-bottom: 22px; max-width: 640px; }
  .fp-hero-tagline span { color: var(--brass-2); font-weight: 800; }
  .fp-hero-anchors { display: flex; flex-direction: column; gap: 6px; margin-bottom: 26px; }
  .fp-anchor { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: 0.2px; }
  .fp-hero-ctas { display: flex; gap: 8px; flex-wrap: wrap; }
  @media(max-width:720px){ .fp-hero-ctas, .fp-hero-anchors { justify-content: center; align-items: center; } }
  .fp-cta { display: inline-block; padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; }
  .fp-cta.big { padding: 13px 26px; font-size: 13px; }
  .fp-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .fp-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  /* ── Body ─────────────────────────────────────────────────────── */
  .fp-body { max-width: 1040px; margin: 0 auto; padding: 44px 24px 60px; }
  .fp-section { margin-bottom: 44px; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .fp-section:last-of-type { border-bottom: none; }
  .fp-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; text-transform: uppercase; }
  .fp-h2 { font-size: clamp(24px, 3.5vw, 34px); font-weight: 800; color: var(--text); letter-spacing: -0.9px; line-height: 1.15; margin: 0 0 20px; }
  .fp-p { font-size: 14.5px; color: var(--text); line-height: 1.75; margin: 0 0 12px; }
  .fp-p b { color: var(--brass-2); font-weight: 800; }
  .fp-p em { color: var(--sub); font-style: italic; }
  .fp-inline { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  /* ── Bio ──────────────────────────────────────────────────────── */
  .fp-bio { padding: 22px 26px; background: rgba(212,175,55,0.03); border-left: 3px solid var(--brass); border-radius: 6px; }
  .fp-bio .fp-p { color: var(--text); font-size: 15px; }

  /* ── Credibility ──────────────────────────────────────────────── */
  .fp-cred-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .fp-cred-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .fp-cred-grid { grid-template-columns: 1fr; } }
  .fp-cred { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .fp-cred-num { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; color: var(--brass); letter-spacing: -1.2px; line-height: 1; margin-bottom: 8px; }
  .fp-cred-lbl { font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; margin-bottom: 4px; }
  .fp-cred-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--sub); letter-spacing: 0.3px; line-height: 1.4; }

  /* ── Rize Developments projects ─────────────────────────────── */
  .fp-projects { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media(max-width:720px){ .fp-projects { grid-template-columns: 1fr; } }
  .fp-project { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .fp-project-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--borderf); flex-wrap: wrap; }
  .fp-project-name { font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 4px; }
  .fp-project-address { font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); letter-spacing: 0.2px; }
  .fp-project-status { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 3px 8px; border: 1px solid; border-radius: 3px; text-transform: uppercase; white-space: nowrap; }
  .fp-project-units { font-size: 13px; color: var(--text); line-height: 1.55; }

  /* ── Showcase ─────────────────────────────────────────────────── */
  .fp-showcase { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:900px){ .fp-showcase { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:560px){ .fp-showcase { grid-template-columns: 1fr; } }
  .fp-ship { display: flex; flex-direction: column; padding: 18px 20px 16px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; text-decoration: none; color: inherit; transition: transform 0.15s, border-color 0.15s; }
  .fp-ship:hover { transform: translateY(-2px); border-left-color: var(--brass-2); box-shadow: 0 8px 24px -12px rgba(0,0,0,0.12); }
  .fp-ship-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .fp-ship-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; line-height: 1.3; }
  .fp-ship-desc { font-size: 12.5px; color: var(--sub); line-height: 1.55; margin-bottom: 12px; flex: 1; }
  .fp-ship-cta { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; color: var(--brass); letter-spacing: 0.4px; letter-spacing: 0.5px; }

  /* ── Public thinking ──────────────────────────────────────────── */
  .fp-public-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media(max-width:800px){ .fp-public-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .fp-public-grid { grid-template-columns: 1fr; } }
  .fp-public { display: block; padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; text-decoration: none; color: inherit; transition: border-color 0.15s; }
  .fp-public:hover { border-color: var(--brass); background: rgba(212,175,55,0.03); }
  .fp-public-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
  .fp-public-icon { font-size: 22px; line-height: 1; }
  .fp-public-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px; }
  .fp-public-val { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: -0.1px; word-break: break-all; }
  .fp-public-desc { font-size: 12.5px; color: var(--sub); line-height: 1.6; }

  /* ── Prior work ───────────────────────────────────────────────── */
  .fp-prior { display: flex; flex-direction: column; gap: 8px; }
  .fp-prior-row { display: grid; grid-template-columns: 90px 1fr; gap: 16px; padding: 16px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid rgba(212,175,55,0.30); border-radius: 8px; }
  .fp-prior-row.current { border-left-color: var(--brass); border-left-width: 4px; background: linear-gradient(90deg, rgba(212,175,55,0.05), var(--card)); }
  .fp-prior-year { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--brass-2); letter-spacing: 0.2px; padding-top: 3px; }
  .fp-prior-row.current .fp-prior-year { color: var(--brass); }
  .fp-prior-role { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .fp-prior-desc { font-size: 13px; color: var(--sub); line-height: 1.65; }

  /* ── Testimonials empty state ─────────────────────────────────── */
  .fp-testi-empty { padding: 40px 32px; text-align: center; background: var(--card); border: 1px dashed rgba(212,175,55,0.30); border-radius: 12px; }
  .fp-testi-icon { font-size: 48px; margin-bottom: 12px; }
  .fp-testi-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 8px; }
  .fp-testi-p { font-size: 13.5px; color: var(--sub); line-height: 1.7; max-width: 580px; margin: 0 auto; }

  /* ── Next 90 days ─────────────────────────────────────────────── */
  .fp-next { display: flex; flex-direction: column; gap: 8px; }
  .fp-next-item { display: grid; grid-template-columns: 130px 1fr; gap: 16px; padding: 14px 18px; background: rgba(33,85,205,0.04); border-left: 3px solid var(--royal); border-radius: 6px; }
  @media(max-width:560px){ .fp-next-item { grid-template-columns: 1fr; } }
  .fp-next-week { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; color: var(--royal); letter-spacing: 0.4px; text-transform: uppercase; }
  .fp-next-body { font-size: 13.5px; color: var(--text); line-height: 1.65; }

  /* ── CTA block ────────────────────────────────────────────────── */
  .fp-cta-block { padding: 34px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 14px; text-align: center; margin-top: 30px; }
  .fp-cta-h { font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.7px; margin-bottom: 10px; }
  .fp-cta-p { font-size: 15px; color: var(--sub); line-height: 1.65; margin-bottom: 22px; max-width: 620px; margin-left: auto; margin-right: auto; }
  .fp-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px; }
  .fp-cta-foot { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.3px; padding-top: 14px; border-top: 1px dashed rgba(212,175,55,0.20); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
