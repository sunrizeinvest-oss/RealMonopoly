/**
 * Changelog — /changelog
 *
 * A chronological feed of what's shipped on RizeAI. Public-facing.
 * The single highest-leverage trust signal for a pre-revenue platform:
 * proves the founder is actively shipping and the product is alive.
 *
 * To add a new entry: prepend an object to RELEASES below. Keep entries
 * tight — one verb-led headline + 2-4 bullet points. Date as ISO.
 *
 * Tags: 'feature' | 'fix' | 'data' | 'performance' | 'design'
 */

import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

const TAG_COLORS = {
  feature:     { bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.35)",   text: "#22c55e" },
  fix:         { bg: "rgba(220,38,38,0.1)",   border: "rgba(220,38,38,0.35)",   text: "#dc2626" },
  data:        { bg: "rgba(33,85,205,0.1)",   border: "rgba(33,85,205,0.35)",   text: "#5b8eff" },
  performance: { bg: "rgba(167,130,255,0.1)", border: "rgba(167,130,255,0.35)", text: "#a782ff" },
  design:      { bg: "rgba(212,175,55,0.1)",  border: "rgba(212,175,55,0.35)",  text: "#d4af37" },
};

const RELEASES = [
  {
    date: "2026-06-26",
    title: "Honest social proof + design partner program",
    bullets: [
      "Replaced placeholder testimonials with a design-partner program CTA",
      "10 Canadian operators get 6 months of Scale tier free for being featured",
      "3 verifiable proof tiles: 7 cities live, $187K Calgary demo, 5s X-Ray median",
    ],
    tags: ["feature", "design"],
  },
  {
    date: "2026-06-26",
    title: "Performance — jsPDF code-split",
    bullets: [
      "jsPDF (370 KB) now lazy-loads only when you click Export PDF",
      "Landing visitors no longer download the PDF library on page load",
      "~115 KB gzipped removed from first-impression payload",
    ],
    tags: ["performance"],
  },
  {
    date: "2026-06-26",
    title: "Mobile audit + universal mobile fixes",
    bullets: [
      "Landing hero, activity feed, stats, trust pills, CTA — all sized for phones",
      "Pricing tier cards scale down at <480px",
      "Activity feed drops ROI column on narrow screens so addresses fit",
    ],
    tags: ["design"],
  },
  {
    date: "2026-06-26",
    title: "FAQ section + TopNav quick-links",
    bullets: [
      "8 accordion questions handling the most common pre-signup objections",
      "TopNav now surfaces For Brokers · For Investors · Pricing",
      "Mobile-tuned: drops Investors + Pricing at <760px, all at <480px",
    ],
    tags: ["feature"],
  },
  {
    date: "2026-06-26",
    title: "Landing cohesion pass — 'Real numbers' proof section",
    bullets: [
      "New section between two-sided cards and X-Ray: 4 stat tiles + CoStar competitive matrix",
      "Unified all section padding to 96px with brass top borders",
      "Hero headline gets a localized dark vignette for readability over the video bg",
    ],
    tags: ["design"],
  },
  {
    date: "2026-06-25",
    title: "Realtor.ca graceful degradation",
    bullets: [
      "Realtor.ca's bot detection now blocks scrape attempts",
      "check-alerts returns 200 + degraded flag instead of crashing as 500",
      "PropertyHub + DealAlerts surface a friendly 'MLS unavailable' notice",
      "Repliers integration is code-ready — drop in REPLIERS_API_KEY to switch over",
    ],
    tags: ["fix"],
  },
  {
    date: "2026-06-22",
    title: "Daily Deal Alerts cron + Supabase persistence",
    bullets: [
      "Alerts now sync to Supabase (was localStorage-only)",
      "Vercel cron fires daily at 09:00 ET, sends Resend digest emails per alert",
      "First-login migration: local alerts get pushed to the cloud automatically",
    ],
    tags: ["feature"],
  },
  {
    date: "2026-06-22",
    title: "MarketBrief — UX restructure",
    bullets: [
      "Subscription UI moved to the top (was buried under ops diagnostics)",
      "Last-sent timestamp shown next to subscription status",
      "Diagnostic panel collapsed by default — auto-opens only on failed checks",
    ],
    tags: ["design"],
  },
  {
    date: "2026-06-21",
    title: "Two-sided positioning: /brokers and /investors",
    bullets: [
      "Industry Side page for commercial brokers + syndicators ($299 Scale wedge)",
      "Investor Side page for individual owners + BRRRR operators (Free → $99 Pro)",
      "Landing's two-sided cards now click through to dedicated landing pages",
      "Demo recording mode at /demo with pre-loaded 24-unit Calgary sample",
    ],
    tags: ["feature"],
  },
  {
    date: "2026-06-20",
    title: "PropertyHub → calculator handoff",
    bullets: [
      "Strategy buttons now pass ?addr=&purchase=&rent=&year= via URL",
      "BRRRR, Commercial, Rehab, Tax all pre-populate from the address you searched",
      "Municipal Open Data card on PropertyHub shows zoning, permits, dev applications",
      "CMHC market-rent anchor card on CommercialAnalyzer with one-click apply",
    ],
    tags: ["feature", "data"],
  },
  {
    date: "2026-06-20",
    title: "Hamilton becomes the 7th city",
    bullets: [
      "Parcel-level zoning + assessment for Hamilton, ON",
      "Now 7 Canadian cities at parcel resolution: Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga, Hamilton",
      "26 CMHC metros for rent + vacancy across the rest of the country",
    ],
    tags: ["data"],
  },
  {
    date: "2026-06-19",
    title: "Rent-roll Loss-to-Lease parser → IC memo PDF",
    bullets: [
      "Drag any broker rent roll PDF onto /commercial",
      "AI OCRs every unit row, cross-references CMHC, computes stranded upside in dollars per door",
      "Real demo on a 24-unit Calgary deal: $187K annual upside, $708/door/mo, 38% below market",
      "Output rolls straight into the 2-page IC memo PDF",
    ],
    tags: ["feature"],
  },
  {
    date: "2026-06-18",
    title: "AI Building Grade — 4 institutional dimensions",
    bullets: [
      "AI analyzes any address across Architecture, Structure, Amenities, Site",
      "Letter grade A–F and Class A/B/C in 4-6 seconds",
      "Surfaces on the Landing X-Ray bar + Property Hub + Commercial Underwriter",
      "Cached per address so re-grades are free",
    ],
    tags: ["feature"],
  },
];

export default function Changelog() {
  useDocMeta({
    title: "Changelog · RizeAI",
    description: "What we've shipped on RizeAI — chronological feed of features, fixes, data updates, and design changes.",
  });
  const navigate = useNavigate();

  const css = `
    .cl-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh}
    body:has(.cl-page){background:#0a1128}

    .cl-hero{padding:80px 24px 40px;text-align:center;position:relative;overflow:hidden}
    .cl-hero::before{content:'';position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(212,175,55,0.06) 0%,transparent 65%);pointer-events:none}
    .cl-hero-inner{max-width:760px;margin:0 auto;position:relative;z-index:1}
    .cl-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px;margin-bottom:18px}
    .cl-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:cl-blink 2s infinite;box-shadow:0 0 8px #22c55e}
    @keyframes cl-blink{0%,100%{opacity:1}50%{opacity:0.3}}
    .cl-h1{font-size:clamp(34px,5vw,52px);font-weight:800;line-height:1.04;letter-spacing:-2px;color:#fff;margin:0 0 16px}
    .cl-h1 span{color:#d4af37;font-style:italic;font-weight:700}
    .cl-sub{font-size:16px;color:#d4d8e0;line-height:1.7;max-width:580px;margin:0 auto}

    .cl-inner{max-width:760px;margin:0 auto;padding:24px 24px 80px}

    .cl-release{padding:24px 26px;background:rgba(0,12,31,0.55);backdrop-filter:blur(8px);border:1px solid rgba(212,175,55,0.18);border-left:2px solid #d4af37;border-radius:8px;margin-bottom:14px;transition:border-color 0.15s, transform 0.15s}
    .cl-release:hover{border-color:rgba(212,175,55,0.4);transform:translateY(-1px)}

    .cl-release-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:12px}
    .cl-release-title{font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.4px;line-height:1.3;margin:0;flex:1;min-width:200px}
    .cl-release-date{font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;color:#94a3b8;letter-spacing:0.4px;flex-shrink:0;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);padding:4px 9px;border-radius:3px}

    .cl-release-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
    .cl-tag{display:inline-block;font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:3px;border:1px solid}

    .cl-release-bullets{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px}
    .cl-release-bullets li{font-size:14px;color:#d4d8e0;line-height:1.65;padding-left:18px;position:relative}
    .cl-release-bullets li::before{content:'▸';position:absolute;left:0;top:0;color:#d4af37;font-weight:700}

    .cl-foot{margin-top:48px;text-align:center;padding:32px 24px;background:linear-gradient(135deg,rgba(33,85,205,0.06),rgba(212,175,55,0.04));border:1px solid rgba(212,175,55,0.22);border-radius:8px}
    .cl-foot-h{font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.4px;margin:0 0 10px}
    .cl-foot-sub{font-size:14px;color:#d4d8e0;line-height:1.6;margin:0 0 18px;max-width:480px;margin-left:auto;margin-right:auto}
    .cl-foot-btn{background:#d4af37;color:#0a1128;border:none;border-radius:4px;padding:12px 22px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:800;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s;text-decoration:none;display:inline-block}
    .cl-foot-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(212,175,55,0.28);background:#e6c252}

    @media(max-width:560px){
      .cl-hero{padding:56px 18px 32px}
      .cl-inner{padding:16px 18px 60px}
      .cl-release{padding:20px 20px}
      .cl-release-title{font-size:15.5px}
      .cl-release-bullets li{font-size:13.5px}
      .cl-foot{padding:24px 18px}
    }
  `;

  return (
    <div className="cl-page">
      <style>{css}</style>
      <TopNav />
      <section className="cl-hero">
        <div className="cl-hero-inner">
          <div className="cl-eyebrow"><span className="cl-eyebrow-dot" /> ▸ ACTIVELY SHIPPING</div>
          <h1 className="cl-h1">What we've shipped <span>on RizeAI.</span></h1>
          <p className="cl-sub">
            A chronological log of every feature, fix, data expansion, and design pass.
            Public and uncurated — if a thing went live, it's listed here.
          </p>
        </div>
      </section>

      <div className="cl-inner">
        {RELEASES.map((r, i) => (
          <article key={i} className="cl-release">
            <div className="cl-release-head">
              <h2 className="cl-release-title">{r.title}</h2>
              <span className="cl-release-date">{r.date}</span>
            </div>
            {r.tags?.length > 0 && (
              <div className="cl-release-tags">
                {r.tags.map(tag => {
                  const c = TAG_COLORS[tag] || TAG_COLORS.feature;
                  return (
                    <span
                      key={tag}
                      className="cl-tag"
                      style={{ background: c.bg, borderColor: c.border, color: c.text }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
            <ul className="cl-release-bullets">
              {r.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </article>
        ))}

        <div className="cl-foot">
          <h3 className="cl-foot-h">Want to shape what ships next?</h3>
          <p className="cl-foot-sub">
            Design partners get a direct line to the founder and their feedback drives the roadmap.
            Send a note — we reply within a business day.
          </p>
          <a className="cl-foot-btn" href="mailto:hello@rizeai.io?subject=Roadmap%20input">
            ▸ Email hello@rizeai.io
          </a>
        </div>
      </div>
    </div>
  );
}
