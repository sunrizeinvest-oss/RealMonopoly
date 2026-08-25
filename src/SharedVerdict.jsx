import { useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { decodeVerdict } from "./lib/shareVerdict";
import { useDocMeta } from "./lib/seo";
import StrategyVerdicts from "./components/StrategyVerdicts";
import ZoningSpecsCard from "./components/ZoningSpecsCard";
import { track } from "./lib/analytics";

/**
 * SharedVerdict — read-only /verdict/:payload page. Broker types /property
 * address → clicks "Share this verdict" → gets a public URL. Recipient opens
 * this page and sees the full 4-strategy verdict + zoning specs, all computed
 * client-side from the encoded snapshot. No auth, no backend.
 *
 * Nothing here consumes the free-tier lookup counter — the sender already
 * spent theirs. Recipient is free-riding on that compute.
 *
 * CTA at the top and bottom points the recipient to /property to type their
 * own address. This is the viral loop.
 */
export default function SharedVerdict() {
  const { payload } = useParams();
  const navigate = useNavigate();
  const property = useMemo(() => decodeVerdict(payload || ""), [payload]);

  const cityLabel = property?.city
    ? `${property.city}${property.province ? `, ${property.province}` : ""}`
    : "";

  useDocMeta({
    title: property?.address ? `${property.address} — Verdict · RizeAI` : "Shared Verdict · RizeAI",
    description: property?.address
      ? `See the RizeAI four-strategy verdict for ${property.address}${cityLabel ? ` in ${cityLabel}` : ""}. Buy & Hold, BRRRR, Flip, and Multifamily — scored and ranked with dimensional zoning specs.`
      : "A RizeAI shared property verdict — four strategies scored, dimensional zoning, AI-anchored comps.",
  });

  // Track view once on mount so we know which shared verdicts get traffic.
  useEffect(() => {
    if (!property?.address) return;
    track("shared_verdict_view", {
      city: property.city || "",
      hasPrice: !!property.purchasePrice,
      hasRent: !!property.rentEstimate,
    });
  }, [property?.address, property?.city, property?.purchasePrice, property?.rentEstimate]);

  // Invalid / malformed payload — show a friendly redirect prompt.
  if (!property) {
    return (
      <div className="sv-wrap">
        <style>{CSS}</style>
        <div className="sv-body" style={{ textAlign: "center", padding: "80px 24px" }}>
          <div className="sv-eyebrow" style={{ marginBottom: 16 }}>
            <span className="sv-eyebrow-dot" />
            LINK BROKEN
          </div>
          <h1 className="sv-h1">This verdict link is malformed.</h1>
          <p style={{ fontSize: 15, color: "var(--sub)", maxWidth: 480, margin: "16px auto 32px", lineHeight: 1.6 }}>
            Someone shared a RizeAI verdict with you, but the URL doesn't decode. Ask them to re-share, or type your own address to see how RizeAI works.
          </p>
          <button className="sv-cta" onClick={() => navigate("/property")}>Type an address →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-wrap">
      <style>{CSS}</style>

      {/* Minimal shared-verdict nav (no full TopNav — we want visitors to
          feel this is a document, not the app they need to sign into) */}
      <div className="sv-topbar">
        <a href="/" className="sv-logo">
          Real <span>Deal</span>
        </a>
        <div className="sv-topbar-tag">▸ SHARED VERDICT · READ-ONLY</div>
        <button className="sv-cta-sm" onClick={() => navigate("/property")}>
          Try your own →
        </button>
      </div>

      <div className="sv-body">
        {/* Property header */}
        <div className="sv-head">
          <div className="sv-eyebrow">
            <span className="sv-eyebrow-dot" />
            {property.address ? `RIZEAI VERDICT · ${cityLabel || "Canada"}` : "SHARED VERDICT"}
          </div>
          <h1 className="sv-h1">{property.address || "Property Verdict"}</h1>

          {/* Key facts strip */}
          <div className="sv-facts">
            {property.purchasePrice && (
              <div className="sv-fact"><div className="sv-fact-lbl">List / Est.</div><div className="sv-fact-val">${Math.round(property.purchasePrice).toLocaleString()}</div></div>
            )}
            {property.rentEstimate && (
              <div className="sv-fact"><div className="sv-fact-lbl">Est. Rent</div><div className="sv-fact-val">${Math.round(property.rentEstimate).toLocaleString()}/mo</div></div>
            )}
            {property.sqft && (
              <div className="sv-fact"><div className="sv-fact-lbl">Sqft</div><div className="sv-fact-val">{property.sqft.toLocaleString()}</div></div>
            )}
            {property.beds && (
              <div className="sv-fact"><div className="sv-fact-lbl">Beds / Baths</div><div className="sv-fact-val">{property.beds} / {property.baths || "—"}</div></div>
            )}
            {property.units && (
              <div className="sv-fact"><div className="sv-fact-lbl">Units</div><div className="sv-fact-val">{property.units}</div></div>
            )}
            {property.zoning && (
              <div className="sv-fact"><div className="sv-fact-lbl">Zoning</div><div className="sv-fact-val">{property.zoning}</div></div>
            )}
            {property.propertyTaxAnnual && (
              <div className="sv-fact"><div className="sv-fact-lbl">Prop. Tax</div><div className="sv-fact-val">${Math.round(property.propertyTaxAnnual).toLocaleString()}/yr</div></div>
            )}
          </div>

          {property.attribution && (
            <div className="sv-attrib">Shared by {property.attribution}</div>
          )}
        </div>

        {/* Four-strategy verdict grid */}
        <StrategyVerdicts property={property} />

        {/* Dimensional zoning specs */}
        {property.zoning && (
          <ZoningSpecsCard
            code={property.zoning}
            city={property.city || property.address}
            lotSize={property.lotSize || null}
          />
        )}

        {/* Big CTA — the viral loop */}
        <div className="sv-cta-wrap">
          <div className="sv-cta-eyebrow">▸ Try RizeAI on your own address</div>
          <div className="sv-cta-h2">Type an address. <span>See the four-strategy verdict.</span></div>
          <p className="sv-cta-sub">5 free lookups this month. No credit card, no signup wall. Same institutional-grade underwriting on your own deals.</p>
          <button className="sv-cta" onClick={() => navigate("/property")}>
            Try RizeAI free →
          </button>
        </div>

        {/* Fine-print — makes clear this is a snapshot */}
        <div className="sv-footnote">
          Verdict generated {property.generatedAt ? new Date(property.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "recently"} · Computed client-side from a shared snapshot ·{" "}
          <a onClick={() => navigate("/vs-biggerpockets")} style={{ color: "var(--brass-2)", cursor: "pointer" }}>Compare RizeAI</a>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .sv-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }

  .sv-topbar {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 20px;
    background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--borderf);
  }
  .sv-logo { font-size: 15px; font-weight: 800; color: var(--text); text-decoration: none; letter-spacing: -0.2px; }
  .sv-logo span { color: var(--blue); }
  .sv-topbar-tag {
    font-family: 'Geist Mono', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
    color: var(--brass-2);
    padding: 4px 10px; border-radius: 4px;
    background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.24);
  }
  .sv-cta-sm {
    padding: 7px 14px; border-radius: 5px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 800;
    letter-spacing: 0.6px; text-transform: uppercase;
    cursor: pointer; transition: transform 120ms;
  }
  .sv-cta-sm:hover { transform: translateY(-1px); }

  .sv-body { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }
  .sv-head { margin-bottom: 24px; }
  .sv-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Geist Mono', monospace;
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
    color: var(--brass-2);
    background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28);
    padding: 5px 10px; border-radius: 4px; margin-bottom: 12px;
  }
  .sv-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .sv-h1 { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.15; margin: 0 0 16px; }

  .sv-facts { display: flex; flex-wrap: wrap; gap: 14px; margin: 16px 0 12px; }
  .sv-fact {
    padding: 8px 12px; border-radius: 6px;
    background: var(--card); border: 1px solid var(--borderf); min-width: 90px;
  }
  .sv-fact-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--sub); margin-bottom: 3px; }
  .sv-fact-val { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }

  .sv-attrib {
    display: inline-block; margin-top: 8px;
    font-size: 12px; color: var(--dim); font-style: italic;
  }

  .sv-cta-wrap {
    margin-top: 40px; padding: 40px 32px; text-align: center;
    background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05));
    border: 1px solid rgba(212,175,55,0.28);
    border-radius: 12px;
  }
  .sv-cta-eyebrow {
    font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700;
    color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase;
    margin-bottom: 10px;
  }
  .sv-cta-h2 {
    font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: var(--text);
    letter-spacing: -0.8px; line-height: 1.2; margin-bottom: 10px;
  }
  .sv-cta-h2 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .sv-cta-sub {
    font-size: 14px; color: var(--sub); line-height: 1.6;
    max-width: 520px; margin: 0 auto 22px;
  }
  .sv-cta {
    padding: 12px 24px; border-radius: 6px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800;
    letter-spacing: 0.8px; text-transform: uppercase;
    cursor: pointer; transition: transform 160ms, box-shadow 200ms;
  }
  .sv-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -12px rgba(212,175,55,0.4); }

  .sv-footnote {
    margin-top: 24px; padding-top: 16px;
    border-top: 1px dashed var(--borderf);
    font-size: 11.5px; color: var(--dim); text-align: center;
  }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
