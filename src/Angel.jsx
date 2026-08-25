import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";
import TopNav from "./components/TopNav";
import { useEffect } from "react";

/**
 * Angel — /angel path for smaller check angel investors.
 *
 * Public (no gate) — angels typically find via LinkedIn / Twitter, not
 * warm VC intro. Shows the $10-50K check path, SAFE terms, and what an
 * angel gets that a fund doesn't. Feeds warm intros into the main round.
 */
export default function Angel() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Angel Round · RizeAI — $10K–$50K checks welcome",
    description: "The RizeAI pre-seed angel path — $10K–$50K checks, SAFE at same terms as the lead round, quarterly updates + product-level access.",
  });

  useEffect(() => { track("angel_page_view"); }, []);

  return (
    <div className="ag-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="ag-body">
        {/* HERO */}
        <div className="ag-hero">
          <div className="ag-eyebrow">
            <span className="ag-eyebrow-dot" />
            ANGEL ROUND · OPEN
          </div>
          <h1 className="ag-h1">Angel checks welcome. <span>$10K to $50K.</span></h1>
          <p className="ag-sub">
            RizeAI is running a pre-seed with a $1.5M target. Angels stack alongside the lead round on <b>the same SAFE terms</b> — no separate valuation, no side letter games. The check that gets you first-look on every future round.
          </p>
          <div className="ag-hero-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="ag-cta" onClick={() => track("angel_book_click")}>
              {BOOKING_LABEL}
            </a>
            <button className="ag-cta ghost" onClick={() => navigate("/pitch")}>See full pitch materials</button>
          </div>
        </div>

        {/* THE OFFER */}
        <section className="ag-section">
          <div className="ag-section-tag">▸ THE OFFER</div>
          <h2 className="ag-h2">The angel structure, plainly.</h2>
          <div className="ag-terms-grid">
            <div className="ag-term">
              <div className="ag-term-lbl">Check size</div>
              <div className="ag-term-val">$10K – $50K</div>
              <div className="ag-term-note">Larger checks welcome via the lead round path — see /pitch</div>
            </div>
            <div className="ag-term brass">
              <div className="ag-term-lbl">Instrument</div>
              <div className="ag-term-val">Y Combinator SAFE</div>
              <div className="ag-term-note">Post-money · 20% discount · matches lead terms</div>
            </div>
            <div className="ag-term">
              <div className="ag-term-lbl">Valuation cap</div>
              <div className="ag-term-val">Lead-round cap</div>
              <div className="ag-term-note">Same terms as institutional lead · no separate cap</div>
            </div>
            <div className="ag-term">
              <div className="ag-term-lbl">Close timing</div>
              <div className="ag-term-val">Rolling</div>
              <div className="ag-term-note">Close within 14 days of committed signature</div>
            </div>
            <div className="ag-term">
              <div className="ag-term-lbl">Minimum</div>
              <div className="ag-term-val">$10K</div>
              <div className="ag-term-note">Below $10K accepted case-by-case for domain experts</div>
            </div>
            <div className="ag-term">
              <div className="ag-term-lbl">Pro-rata</div>
              <div className="ag-term-val">Yes · to $250K max</div>
              <div className="ag-term-note">Angels get pro-rata rights up to $250K per subsequent round</div>
            </div>
          </div>
        </section>

        {/* WHAT ANGELS GET */}
        <section className="ag-section">
          <div className="ag-section-tag">▸ WHAT YOU GET (BEYOND EQUITY)</div>
          <h2 className="ag-h2">Because angels aren't just capital.</h2>
          <div className="ag-perks-grid">
            <div className="ag-perk">
              <div className="ag-perk-icon">📬</div>
              <div className="ag-perk-h">Monthly investor update</div>
              <div className="ag-perk-p">Actual numbers — MRR, users, cash — not a slide deck of vibes. Sent 1st of every month.</div>
            </div>
            <div className="ag-perk">
              <div className="ag-perk-icon">🔓</div>
              <div className="ag-perk-h">Scale-tier access, free for life</div>
              <div className="ag-perk-p">$299/mo tier is yours as long as you hold the SAFE. Use the product yourself or gift the seat.</div>
            </div>
            <div className="ag-perk">
              <div className="ag-perk-icon">🎟️</div>
              <div className="ag-perk-h">First-look on future rounds</div>
              <div className="ag-perk-p">Seed → Series A intro emails go to angels first. Pro-rata is real, not a paper right.</div>
            </div>
            <div className="ag-perk">
              <div className="ag-perk-icon">🤝</div>
              <div className="ag-perk-h">1:1 founder access</div>
              <div className="ag-perk-p">Quarterly 30-min call. Ask anything. This is the biggest asymmetry vs a fund's check.</div>
            </div>
            <div className="ag-perk">
              <div className="ag-perk-icon">🏷️</div>
              <div className="ag-perk-h">"Angel" in the pitch deck</div>
              <div className="ag-perk-p">With your permission, your name lands on the investors page — social proof for the next round.</div>
            </div>
            <div className="ag-perk">
              <div className="ag-perk-icon">🎯</div>
              <div className="ag-perk-h">Ask for 1 warm intro</div>
              <div className="ag-perk-p">In exchange for the equity, we ask one thing: one warm intro to a fund, broker, or partner where you have real signal.</div>
            </div>
          </div>
        </section>

        {/* WHY THIS ROUND */}
        <section className="ag-section">
          <div className="ag-section-tag">▸ WHY THIS ROUND, WHY NOW</div>
          <h2 className="ag-h2">The 3-sentence version.</h2>
          <div className="ag-thesis">
            <p className="ag-thesis-p"><b>What we're building:</b> the underwriting layer that lets every Canadian broker run institutional-grade deal analysis (BRRRR / Hold / Flip / Multiplex build) on any listing in 3 seconds. Live in 7 cities today with 37 zoning codes hand-verified against city bylaws.</p>
            <p className="ag-thesis-p"><b>Why it works now:</b> LLM cost dropped 40× since 2023 (Anthropic our AI at $0.001/verdict), Canadian cities rewrote residential zoning between 2023-2025 (Toronto multiplex, Edmonton 20001), and 2024 commission compression forces brokers to underwrite faster to survive. See <a onClick={() => navigate("/pitch/why-now")}>the full macro thesis →</a></p>
            <p className="ag-thesis-p"><b>Why us, why this check:</b> Solo founder, 4-strategy math engine live in production, real API partners of record with Anthropic + Vercel + Supabase. The angel round exists to accelerate the 20-DMs/day founder-outreach into a real GTM engine. Payback per broker signed: ~1.8 months.</p>
          </div>
          <div className="ag-links-row">
            <button className="ag-link" onClick={() => navigate("/pitch/deck")}>Slide deck →</button>
            <button className="ag-link" onClick={() => navigate("/pitch/unit-economics")}>Unit economics →</button>
            <button className="ag-link" onClick={() => navigate("/live")}>Live metrics →</button>
            <button className="ag-link" onClick={() => navigate("/case-studies")}>Case studies →</button>
          </div>
        </section>

        {/* WHO WE WANT */}
        <section className="ag-section">
          <div className="ag-section-tag">▸ IDEAL ANGELS</div>
          <h2 className="ag-h2">Not just capital. Signal.</h2>
          <div className="ag-fit-grid">
            <div className="ag-fit">
              <div className="ag-fit-h">✓ Canadian real estate operators</div>
              <div className="ag-fit-p">Broker principals, developers, mortgage brokers, PE partners. You know the market and you'll use the product.</div>
            </div>
            <div className="ag-fit">
              <div className="ag-fit-h">✓ Prior PropTech / FinTech founders</div>
              <div className="ag-fit-p">Founders who've raised a seed, built + sold something in-adjacent, and know what patterns work here.</div>
            </div>
            <div className="ag-fit">
              <div className="ag-fit-h">✓ VC scouts + syndicate leads</div>
              <div className="ag-fit-p">If you run a scout program or lead a syndicate, this is a natural fit — pre-seed with proven traction, warm to your fund's pipeline.</div>
            </div>
            <div className="ag-fit">
              <div className="ag-fit-h">— Not accepting</div>
              <div className="ag-fit-p" style={{color:"var(--sub)"}}>Family/friends checks under $10K, pure passive angels with no domain overlap, US-only investors (unless you can help with US expansion Year 2).</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="ag-cta-block">
          <div className="ag-cta-h">Interested?</div>
          <div className="ag-cta-p">30-second commitment: book an intro call. If it's a fit for both sides, wire happens within 14 days.</div>
          <div className="ag-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="ag-cta big" onClick={() => track("angel_book_click_cta")}>
              {BOOKING_LABEL}
            </a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20Angel%20Round" className="ag-cta ghost">Email instead</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .ag-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ag-body { max-width: 940px; margin: 0 auto; padding: 48px 24px 80px; }

  .ag-hero { text-align: center; margin-bottom: 44px; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .ag-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .ag-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ag-h1 { font-size: clamp(32px, 5vw, 52px); font-weight: 800; color: var(--text); letter-spacing: -1.8px; line-height: 1.05; margin: 0 0 16px; }
  .ag-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .ag-sub { font-size: 16px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto 28px; }
  .ag-sub b { color: var(--brass-2); font-weight: 800; }
  .ag-hero-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .ag-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .ag-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .ag-h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.2; margin: 0 0 20px; }

  .ag-terms-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media(max-width:720px){ .ag-terms-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .ag-terms-grid { grid-template-columns: 1fr; } }
  .ag-term { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .ag-term.brass { border-left: 3px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.05), transparent); }
  .ag-term-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; margin-bottom: 6px; }
  .ag-term-val { font-family: 'Geist Mono', monospace; font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; line-height: 1; margin-bottom: 6px; }
  .ag-term.brass .ag-term-val { color: var(--brass); }
  .ag-term-note { font-size: 11.5px; color: var(--sub); line-height: 1.45; }

  .ag-perks-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:720px){ .ag-perks-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .ag-perks-grid { grid-template-columns: 1fr; } }
  .ag-perk { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .ag-perk-icon { font-size: 26px; margin-bottom: 8px; }
  .ag-perk-h { font-size: 14.5px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .ag-perk-p { font-size: 12.5px; color: var(--sub); line-height: 1.55; }

  .ag-thesis { padding: 22px 24px; background: rgba(212,175,55,0.04); border-left: 3px solid var(--brass); border-radius: 6px; margin-bottom: 20px; }
  .ag-thesis-p { font-size: 14.5px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .ag-thesis-p:last-child { margin-bottom: 0; }
  .ag-thesis-p b { color: var(--brass-2); font-weight: 800; }
  .ag-thesis-p a { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); cursor: pointer; }
  .ag-links-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .ag-link { padding: 7px 12px; border-radius: 5px; background: transparent; color: var(--brass-2); border: 1px solid rgba(212,175,55,0.30); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; text-transform: uppercase; }
  .ag-link:hover { background: rgba(212,175,55,0.08); }

  .ag-fit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media(max-width:640px){ .ag-fit-grid { grid-template-columns: 1fr; } }
  .ag-fit { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .ag-fit-h { font-size: 14.5px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .ag-fit-p { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .ag-cta-block { padding: 34px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; }
  .ag-cta-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 8px; }
  .ag-cta-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin-bottom: 22px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .ag-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .ag-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .ag-cta.big { padding: 14px 28px; font-size: 13px; }
  .ag-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .ag-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
