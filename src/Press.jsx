import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";
import { RAISE, formatUSD } from "./lib/raiseConfig";

/**
 * Press — /press public press kit + brand assets.
 *
 * Every VC memo / partner writeup needs boilerplate. Currently forces email
 * round-trip to get one-line company descriptions and logos. This page makes
 * it self-serve so journalists, VCs, and partner marketing can move fast.
 */
export default function Press() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Press Kit · RizeAI",
    description: "Official RizeAI press kit — boilerplate, brand assets, founder bio, product screenshots, and PR contact.",
  });

  useEffect(() => { track("press_page_view"); }, []);

  const copyToClipboard = (text, label) => {
    try {
      navigator.clipboard?.writeText(text);
      track("press_copy", { label });
      const el = document.getElementById("pr-copy-flash");
      if (el) {
        el.textContent = `✓ Copied · ${label}`;
        el.style.opacity = "1";
        setTimeout(() => { el.style.opacity = "0"; }, 1600);
      }
    } catch {}
  };

  return (
    <div className="pr-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div id="pr-copy-flash" className="pr-flash" />

      <div className="pr-body">
        {/* HEADER */}
        <div className="pr-header">
          <div className="pr-eyebrow">
            <span className="pr-eyebrow-dot" />
            PRESS KIT · REPUBLISHING OK
          </div>
          <h1 className="pr-h1">Everything you need <span>to write about RizeAI.</span></h1>
          <p className="pr-sub">
            Boilerplate, brand assets, founder details, product context. Grab, quote, embed. If you need something not below, email <a href="mailto:sunni@rizedevelopments.com">sunni@rizedevelopments.com</a> — 24h response.
          </p>
        </div>

        {/* ONE-LINER */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ ONE-LINER · 12 WORDS</div>
          <div className="pr-quote-card">
            <div className="pr-quote-text">
              RizeAI is the institutional underwriting layer for Canadian residential real estate.
            </div>
            <button className="pr-copy-btn" onClick={() => copyToClipboard(
              "RizeAI is the institutional underwriting layer for Canadian residential real estate.",
              "one-liner"
            )}>Copy</button>
          </div>
        </section>

        {/* SHORT DESC */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ SHORT DESCRIPTION · 40 WORDS</div>
          <div className="pr-quote-card">
            <div className="pr-quote-text">
              RizeAI gives Canadian brokers, agents, and investors institutional-grade real estate underwriting in 3 seconds. Type any address; get BRRRR, hold, flip, and multiplex verdicts backed by real zoning bylaws and CMHC-anchored rents across 7 cities.
            </div>
            <button className="pr-copy-btn" onClick={() => copyToClipboard(
              "RizeAI gives Canadian brokers, agents, and investors institutional-grade real estate underwriting in 3 seconds. Type any address; get BRRRR, hold, flip, and multiplex verdicts backed by real zoning bylaws and CMHC-anchored rents across 7 cities.",
              "short description"
            )}>Copy</button>
          </div>
        </section>

        {/* LONG DESC */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ LONG DESCRIPTION · 120 WORDS</div>
          <div className="pr-quote-card">
            <div className="pr-quote-text">
              RizeAI is the institutional underwriting layer for Canadian residential real estate. Brokers, investors, and firms use RizeAI to underwrite any listing in 3 seconds — four strategies (BRRRR, Buy & Hold, Fix & Flip, Multiplex Build) computed in parallel against city-specific zoning bylaws and CMHC-anchored rent data. Live in Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, and Hamilton with 37 zoning codes hand-verified against municipal bylaws. Founded 2026 by Sunni Yaremchuk in Edmonton, AB. Free tier for individuals; Pro ($99/mo) for daily-user brokers; Scale ($299/mo) for firms with white-label PDF branding and public API access. Currently raising a $1.5M pre-seed.
            </div>
            <button className="pr-copy-btn" onClick={() => copyToClipboard(
              "RizeAI is the institutional underwriting layer for Canadian residential real estate. Brokers, investors, and firms use RizeAI to underwrite any listing in 3 seconds — four strategies (BRRRR, Buy & Hold, Fix & Flip, Multiplex Build) computed in parallel against city-specific zoning bylaws and CMHC-anchored rent data. Live in Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, and Hamilton with 37 zoning codes hand-verified against municipal bylaws. Founded 2026 by Sunni Yaremchuk in Edmonton, AB. Free tier for individuals; Pro ($99/mo) for daily-user brokers; Scale ($299/mo) for firms with white-label PDF branding and public API access. Currently raising a $1.5M pre-seed.",
              "long description"
            )}>Copy</button>
          </div>
        </section>

        {/* FAST FACTS */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ FAST FACTS</div>
          <div className="pr-facts-grid">
            <FactCard label="Founded" val="2026" />
            <FactCard label="HQ" val="Edmonton, AB" />
            <FactCard label="Founder" val="Sunni Yaremchuk" />
            <FactCard label="Team size" val="1 (hiring)" />
            <FactCard label="Cities live" val="7 (CA)" />
            <FactCard label="Zoning codes" val="37" />
            <FactCard label="Raise stage" val="Pre-Seed" />
            <FactCard label="Raise target" val={formatUSD(RAISE.targetUSD)} brass />
            <FactCard label="Instrument" val="YC SAFE" />
            <FactCard label="Free tier" val="5 lookups/mo" />
            <FactCard label="Pro tier" val="$99/mo" />
            <FactCard label="Scale tier" val="$299/mo" />
          </div>
        </section>

        {/* FOUNDER */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ FOUNDER</div>
          <div className="pr-founder">
            <div className="pr-founder-avatar"><img src="/founder-sunni.jpg" alt="Sunni Yaremchuk" /></div>
            <div className="pr-founder-body">
              <div className="pr-founder-name">Sunni Yaremchuk</div>
              <div className="pr-founder-role">Founder + CEO · RizeAI · Also Founder at Rize Developments</div>
              <div className="pr-founder-bio">
                Founder + CEO of RizeAI. Also active Edmonton multifamily developer through Rize Developments (4 infill projects · 28 doors under development). Wanted to save time on his own underwriting and be more efficient — no solution existed, so he built one. RizeAI is the same tool he uses himself every week. Based in Edmonton, AB.<br />
                Contact: <a href="mailto:sunni@rizedevelopments.com">sunni@rizedevelopments.com</a> · <a href="tel:+15878440420">(587) 844-0420</a> · <a href="https://www.linkedin.com/in/sunni-yaremchuk-9b1484222/" target="_blank" rel="noreferrer">LinkedIn</a> · <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer">Rize Developments</a>
              </div>
            </div>
          </div>
        </section>

        {/* BRAND ASSETS */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ BRAND ASSETS</div>
          <p className="pr-p">Logo, wordmark, and product screenshots. Rights: <b>republishing OK</b> for editorial use. Do not modify colors, warp proportions, or add drop shadows.</p>
          <div className="pr-assets-grid">
            <div className="pr-asset">
              <div className="pr-asset-preview">
                <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:-0.3}}>Real <span style={{color:"#d4af37"}}>Deal</span></span>
              </div>
              <div className="pr-asset-name">Wordmark · dark</div>
              <div className="pr-asset-note">SVG · PNG @ 512, 1024, 2048</div>
              <a href="/brand/rizeai-wordmark-dark.svg" download className="pr-asset-btn">Download</a>
            </div>
            <div className="pr-asset light">
              <div className="pr-asset-preview">
                <span style={{fontSize:22,fontWeight:800,color:"#0a1128",letterSpacing:-0.3}}>Real <span style={{color:"#b58900"}}>Deal</span></span>
              </div>
              <div className="pr-asset-name">Wordmark · light</div>
              <div className="pr-asset-note">SVG · PNG @ 512, 1024, 2048</div>
              <a href="/brand/rizeai-wordmark-light.svg" download className="pr-asset-btn">Download</a>
            </div>
            <div className="pr-asset">
              <div className="pr-asset-preview">
                <span style={{fontSize:38,fontWeight:800,color:"#d4af37"}}>R</span>
              </div>
              <div className="pr-asset-name">Icon</div>
              <div className="pr-asset-note">SVG · PNG @ 128, 256, 512, 1024</div>
              <a href="/brand/rizeai-icon.svg" download className="pr-asset-btn">Download</a>
            </div>
            <div className="pr-asset">
              <div className="pr-asset-preview">📸</div>
              <div className="pr-asset-name">Product screenshots</div>
              <div className="pr-asset-note">4 hero shots · 1920×1080 · PNG</div>
              <a href="/brand/rizeai-product-screenshots.zip" download className="pr-asset-btn">Download</a>
            </div>
          </div>
          <p className="pr-p" style={{fontSize:11.5,color:"var(--sub)",marginTop:12}}>
            <b>Note:</b> The download links above resolve when files land in <code>/public/brand/</code>. Currently placeholder — request via email if urgent.
          </p>
        </section>

        {/* COLOR PALETTE */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ COLOR PALETTE</div>
          <div className="pr-palette">
            <SwatchCard color="#0a1128" name="Navy" hex="#0a1128" desc="Primary background" />
            <SwatchCard color="#d4af37" name="Brass" hex="#d4af37" desc="Primary accent" />
            <SwatchCard color="#b58900" name="Brass 2" hex="#b58900" desc="Secondary brass" />
            <SwatchCard color="#2155cd" name="Royal" hex="#2155cd" desc="Secondary accent" />
            <SwatchCard color="#16a34a" name="Green" hex="#16a34a" desc="Success / GO verdicts" />
            <SwatchCard color="#dc2626" name="Red" hex="#dc2626" desc="Failure / PASS verdicts" />
          </div>
        </section>

        {/* KEY LINKS */}
        <section className="pr-section">
          <div className="pr-section-tag">▸ KEY LINKS</div>
          <div className="pr-links-grid">
            <LinkCard href="/" label="Landing" desc="Main product page" onClick={() => navigate("/")} />
            <LinkCard href="/property" label="Live product" desc="Try any address — no signup" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")} />
            <LinkCard href="/live" label="Live metrics" desc="Real-time platform stats" onClick={() => navigate("/live")} />
            <LinkCard href="/story" label="Founder story" desc="Origin narrative" onClick={() => navigate("/story")} />
            <LinkCard href="/case-studies" label="Case studies" desc="Broker walkthroughs" onClick={() => navigate("/case-studies")} />
            <LinkCard href="/roadmap" label="Public roadmap" desc="Shipped + next-90-days" onClick={() => navigate("/roadmap")} />
            <LinkCard href="/updates" label="Investor updates" desc="Monthly public archive" onClick={() => navigate("/updates")} />
            <LinkCard href="/api-docs" label="API docs" desc="Public API reference" onClick={() => navigate("/api-docs")} />
          </div>
        </section>

        {/* CONTACT */}
        <div className="pr-cta-block">
          <div className="pr-cta-h">Interview request or feature story?</div>
          <div className="pr-cta-p">Founder is available for interviews with 48h notice. Faster for breaking market news.</div>
          <div className="pr-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="pr-cta">{BOOKING_LABEL}</a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Press%20Inquiry" className="pr-cta ghost">
              sunni@rizedevelopments.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FactCard({ label, val, brass }) {
  return (
    <div className={`pr-fact ${brass ? "brass" : ""}`}>
      <div className="pr-fact-lbl">{label}</div>
      <div className="pr-fact-val">{val}</div>
    </div>
  );
}

function SwatchCard({ color, name, hex, desc }) {
  return (
    <div className="pr-swatch">
      <div className="pr-swatch-color" style={{ background: color }} />
      <div className="pr-swatch-body">
        <div className="pr-swatch-name">{name}</div>
        <div className="pr-swatch-hex">{hex}</div>
        <div className="pr-swatch-desc">{desc}</div>
      </div>
    </div>
  );
}

function LinkCard({ label, desc, onClick }) {
  return (
    <button className="pr-link-card" onClick={onClick}>
      <div className="pr-link-label">{label} →</div>
      <div className="pr-link-desc">{desc}</div>
    </button>
  );
}

const CSS = `
  .pr-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .pr-body { max-width: 980px; margin: 0 auto; padding: 44px 24px 80px; }

  .pr-flash { position: fixed; top: 68px; left: 50%; transform: translateX(-50%); padding: 10px 18px; background: #16a34a; color: #fff; border-radius: 6px; font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.4px; opacity: 0; transition: opacity 0.3s; z-index: 200; pointer-events: none; }

  .pr-header { text-align: center; margin-bottom: 34px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .pr-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .pr-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pr-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .pr-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pr-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }
  .pr-sub a { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  .pr-section { margin-bottom: 32px; padding-bottom: 26px; border-bottom: 1px solid var(--borderf); }
  .pr-section:last-of-type { border-bottom: none; }
  .pr-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; text-transform: uppercase; }
  .pr-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; margin: 0 0 12px; }
  .pr-p b { color: var(--text); font-weight: 800; }
  .pr-p code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 1px 5px; border-radius: 3px; font-size: 11.5px; color: var(--brass-2); }

  .pr-quote-card { display: flex; align-items: stretch; gap: 12px; padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 8px; }
  .pr-quote-text { flex: 1; font-size: 14.5px; color: var(--text); line-height: 1.65; }
  .pr-copy-btn { padding: 8px 14px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; white-space: nowrap; height: fit-content; }
  .pr-copy-btn:hover { background: var(--brass-2); }

  .pr-facts-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media(max-width:720px){ .pr-facts-grid { grid-template-columns: repeat(2, 1fr); } }
  .pr-fact { padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; }
  .pr-fact.brass { border-left: 3px solid var(--brass); }
  .pr-fact-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: var(--sub); text-transform: uppercase; margin-bottom: 4px; }
  .pr-fact-val { font-family: 'Geist Mono', monospace; font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .pr-fact.brass .pr-fact-val { color: var(--brass); }

  .pr-founder { display: grid; grid-template-columns: 84px 1fr; gap: 18px; padding: 20px 22px; background: var(--card); border: 1px solid var(--borderf); border-left: 4px solid var(--brass); border-radius: 10px; }
  @media(max-width:560px){ .pr-founder { grid-template-columns: 1fr; text-align: center; } }
  .pr-founder-avatar { width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 36px; font-weight: 800; margin: 0 auto; overflow: hidden; border: 2px solid var(--brass); }
  .pr-founder-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .pr-founder-name { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 4px; }
  .pr-founder-role { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; margin-bottom: 12px; }
  .pr-founder-bio { font-size: 13.5px; color: var(--sub); line-height: 1.7; }
  .pr-founder-bio a { color: var(--brass-2); text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  .pr-assets-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .pr-assets-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .pr-assets-grid { grid-template-columns: 1fr; } }
  .pr-asset { padding: 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .pr-asset.light .pr-asset-preview { background: #f5f5ef; }
  .pr-asset-preview { display: flex; align-items: center; justify-content: center; height: 90px; background: #0a1128; border-radius: 4px; margin-bottom: 10px; }
  .pr-asset-name { font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; margin-bottom: 3px; }
  .pr-asset-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--sub); letter-spacing: 0.3px; margin-bottom: 10px; }
  .pr-asset-btn { display: inline-block; padding: 6px 10px; border-radius: 4px; background: rgba(15,23,42,0.04); color: var(--text); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; text-decoration: none; }
  .pr-asset-btn:hover { background: rgba(212,175,55,0.08); color: var(--brass-2); border-color: var(--brass); }

  .pr-palette { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  @media(max-width:640px){ .pr-palette { grid-template-columns: 1fr 1fr; } }
  .pr-swatch { display: flex; gap: 12px; padding: 10px 12px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; align-items: center; }
  .pr-swatch-color { width: 44px; height: 44px; border-radius: 5px; border: 1px solid var(--borderf); flex-shrink: 0; }
  .pr-swatch-name { font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
  .pr-swatch-hex { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.3px; }
  .pr-swatch-desc { font-size: 11px; color: var(--sub); margin-top: 2px; }

  .pr-links-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media(max-width:720px){ .pr-links-grid { grid-template-columns: 1fr 1fr; } }
  .pr-link-card { padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; cursor: pointer; text-align: left; font-family: 'Geist', sans-serif; }
  .pr-link-card:hover { border-color: var(--brass); background: rgba(212,175,55,0.05); }
  .pr-link-label { font-size: 13px; font-weight: 800; color: var(--brass-2); letter-spacing: -0.2px; margin-bottom: 3px; }
  .pr-link-desc { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--sub); letter-spacing: 0.3px; }

  .pr-cta-block { padding: 30px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .pr-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .pr-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .pr-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .pr-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .pr-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pr-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
