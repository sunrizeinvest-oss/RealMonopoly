import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * ApiDocs — /api-docs public documentation page.
 *
 * Reference for the /api/v1/verdict endpoint. Covers auth, request format,
 * response schema, rate limits, and copy-paste curl examples. Public — no
 * auth required to view (this is a developer sales surface).
 */
export default function ApiDocs() {
  const navigate = useNavigate();

  useDocMeta({
    title: "API Docs · RizeAI — Programmatic Real Estate Verdict Engine",
    description: "Documentation for the RizeAI v1 API — programmatic four-strategy verdict, dimensional zoning specs, and AI thesis for any Canadian address. Scale-tier only.",
  });

  return (
    <div className="ad-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="ad-body">
        <div className="ad-header">
          <div className="ad-eyebrow">
            <span className="ad-eyebrow-dot" />
            REST API · v1 · SCALE TIER
          </div>
          <h1 className="ad-h1">RizeAI API. <span>One endpoint. Full verdict.</span></h1>
          <p className="ad-sub">
            Programmatic access to the same four-strategy verdict + dimensional zoning + AI thesis engine that powers <a onClick={() => navigate("/property")}>/property</a>.
            Scale tier ($299/mo CAD) includes 5,000 API calls per month.
          </p>
          <div className="ad-cta-row">
            <button className="ad-cta" onClick={() => navigate("/settings/api-keys")}>Get an API key →</button>
            <button className="ad-cta ghost" onClick={() => navigate("/pricing")}>See Scale pricing</button>
          </div>
        </div>

        {/* Authentication */}
        <section className="ad-section">
          <h2 className="ad-h2">Authentication</h2>
          <p className="ad-p">Every request must include an API key via either header:</p>
          <pre className="ad-code">
{`Authorization: Bearer rzai_live_XXXXXXXXXXXXXXXXXX
# or
X-API-Key: rzai_live_XXXXXXXXXXXXXXXXXX`}
          </pre>
          <p className="ad-p">Generate keys from <a onClick={() => navigate("/settings/api-keys")}>/settings/api-keys</a>. Keys are shown once — store them in your secrets manager.</p>
        </section>

        {/* Endpoint */}
        <section className="ad-section">
          <h2 className="ad-h2">POST /api/v1/verdict</h2>
          <p className="ad-p">Runs the full RizeAI underwriting pipeline against any address. Returns the property blob, four strategy verdicts, and dimensional zoning specs (when available for the property's zoning code).</p>

          <h3 className="ad-h3">Request</h3>
          <pre className="ad-code">
{`POST https://www.realdealestate.app/api/v1/verdict
Content-Type: application/json
Authorization: Bearer rzai_live_XXXXXXXXXXXXXXXXXX

{
  "address": "2424 Westmount Rd NW, Calgary AB"
}`}
          </pre>

          <h3 className="ad-h3">Response — 200 OK</h3>
          <pre className="ad-code">
{`{
  "success": true,
  "request_id": "req_a1b2c3d4e5f6a7b8c9d0",
  "property": {
    "address": "2424 Westmount Rd NW",
    "city": "Calgary",
    "province": "AB",
    "purchasePrice": 900000,
    "estimatedValue": 925000,
    "rentEstimate": 3200,
    "sqft": 1400,
    "beds": 3, "baths": 2,
    "units": 2,
    "propertyTaxAnnual": 4800,
    "zoning": "R-C2",
    "lotSize": 5500
  },
  "verdicts": [
    {
      "key": "brrrr",
      "name": "BRRRR",
      "viable": true,
      "verdict": "STRONG",
      "color": "#16a34a",
      "headline": "Infinite CoC",
      "subhead": "$267/mo cashflow · $0K left in",
      "metrics": [
        { "label": "ARV mid",     "value": "$1,050K" },
        { "label": "Refi @ 75%",  "value": "$787K" },
        { "label": "Cash left in","value": "$0 (all out)" },
        { "label": "5-yr equity", "value": "$243K" }
      ],
      "route": "/brrrr"
    },
    { "key": "hold",  "name": "Buy & Hold",  "verdict": "GO",     "headline": "5.8% CoC",   ... },
    { "key": "flip",  "name": "Fix & Flip",  "verdict": "CAUTION","headline": "+$32K profit", ... },
    { "key": "mf",    "name": "Multifamily", "viable": false, "reason": "SFH — see Buy & Hold" }
  ],
  "zoning_specs": {
    "code": "R-C2",
    "name": "Residential – Contextual One / Two Dwelling",
    "maxHeightM": 10,
    "maxFAR": null,
    "maxCoverage": 0.45,
    "maxUnits": 2,
    "minLotAreaM2": 371,
    "setbacks": { "front": 6.0, "rear": 7.5, "side": 1.2 },
    "permittedUses": "Single detached · duplex · secondary suite (up to 4 total)",
    "note": "Common infill zone — supports duplex with basement suites.",
    "bylawUrl": "https://www.calgary.ca/planning/land-use/bylaw-1p2007.html"
  },
  "credits": {
    "used_this_month": 42,
    "monthly_limit": 5000,
    "tier": "scale"
  },
  "meta": {
    "duration_ms": 2847,
    "api_version": "1.0"
  }
}`}
          </pre>

          <h3 className="ad-h3">Response — 4xx / 5xx errors</h3>
          <pre className="ad-code">
{`{
  "success": false,
  "error": {
    "code": "monthly_quota_exceeded",
    "message": "Monthly quota of 5000 calls exceeded. Resets at UTC month boundary."
  }
}`}
          </pre>
        </section>

        {/* Error codes */}
        <section className="ad-section">
          <h2 className="ad-h2">Error codes</h2>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Status</th><th>Code</th><th>Meaning</th></tr>
              </thead>
              <tbody>
                <tr><td>400</td><td>missing_address</td><td>Request body missing required <code>address</code> field.</td></tr>
                <tr><td>401</td><td>invalid_key</td><td>API key not recognized or malformed.</td></tr>
                <tr><td>401</td><td>revoked_key</td><td>Key was revoked. Generate a new one.</td></tr>
                <tr><td>402</td><td>no_api_access</td><td>User's subscription tier doesn't include API access.</td></tr>
                <tr><td>429</td><td>monthly_quota_exceeded</td><td>Hit your plan's monthly limit. Resets at UTC month boundary.</td></tr>
                <tr><td>503</td><td>backend_unavailable</td><td>Auth backend temporarily down. Retry with backoff.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Rate limits */}
        <section className="ad-section">
          <h2 className="ad-h2">Rate limits</h2>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Tier</th><th>Monthly calls</th><th>Reset</th></tr>
              </thead>
              <tbody>
                <tr><td>Free</td><td>0</td><td>—</td></tr>
                <tr><td>Pro ($99/mo)</td><td>0</td><td>—</td></tr>
                <tr><td>Scale ($299/mo)</td><td>5,000</td><td>1st of each month, 00:00 UTC</td></tr>
                <tr><td>Enterprise</td><td>Custom</td><td>Contact sunni@rizedevelopments.com</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Curl example */}
        <section className="ad-section">
          <h2 className="ad-h2">curl example</h2>
          <pre className="ad-code">
{`curl -X POST https://www.realdealestate.app/api/v1/verdict \\
  -H "Authorization: Bearer $RIZEAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"address": "2424 Westmount Rd NW, Calgary AB"}' | jq`}
          </pre>
        </section>

        {/* Node example */}
        <section className="ad-section">
          <h2 className="ad-h2">Node example</h2>
          <pre className="ad-code">
{`import fetch from "node-fetch";

const r = await fetch("https://www.realdealestate.app/api/v1/verdict", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.RIZEAI_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ address: "2424 Westmount Rd NW, Calgary AB" }),
});
const data = await r.json();
console.log(data.verdicts.find(v => v.key === "brrrr"));`}
          </pre>
        </section>

        {/* Best practices */}
        <section className="ad-section">
          <h2 className="ad-h2">Best practices</h2>
          <ul className="ad-list">
            <li><b>Cache verdicts client-side.</b> Verdicts don't change unless the property's inputs change — cache by address for at least a day to conserve quota.</li>
            <li><b>Retry with exponential backoff on 503.</b> The underlying property-lookup pipeline hits Nominatim + city adapters; occasional 503s are transient.</li>
            <li><b>Use one key per environment.</b> Separate <i>Production</i>, <i>Staging</i>, and <i>Development</i> keys so revocation blast radius stays contained.</li>
            <li><b>Rotate keys quarterly.</b> Generate new, revoke old — same as any credential hygiene.</li>
            <li><b>Read <code>credits.used_this_month</code>.</b> Every response includes your live quota status — use it to throttle proactively.</li>
          </ul>
        </section>

        {/* Bottom CTA */}
        <div className="ad-bottom-cta">
          <div className="ad-bottom-cta-h">Ready to integrate?</div>
          <p>Grab a Scale-tier key and start piping the four-strategy verdict into your CRM, brokerage tool, or investor portal.</p>
          <div className="ad-cta-row">
            <button className="ad-cta" onClick={() => navigate("/settings/api-keys")}>Get an API key →</button>
            <button className="ad-cta ghost" onClick={() => navigate("/pricing")}>Compare plans</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .ad-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ad-body { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }

  .ad-header { margin-bottom: 40px; }
  .ad-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .ad-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ad-h1 { font-size: clamp(26px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.3px; line-height: 1.1; margin: 0 0 14px; }
  .ad-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .ad-sub { font-size: 15px; color: var(--sub); line-height: 1.65; margin: 0 0 20px; max-width: 720px; }
  .ad-sub a { color: var(--brass-2); cursor: pointer; text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); text-underline-offset: 2px; }

  .ad-cta-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .ad-cta { padding: 10px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; transition: transform 160ms; }
  .ad-cta:hover { transform: translateY(-1px); }
  .ad-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .ad-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .ad-section { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid var(--borderf); }
  .ad-section:last-of-type { border-bottom: none; }
  .ad-h2 { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin: 0 0 14px; }
  .ad-h3 { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.6px; text-transform: uppercase; margin: 20px 0 8px; }
  .ad-p { font-size: 14.5px; color: var(--text); line-height: 1.6; margin: 0 0 10px; }
  .ad-p a { color: var(--brass-2); cursor: pointer; text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); text-underline-offset: 2px; }

  .ad-code {
    background: #0a1128; color: #f0f0f0;
    font-family: 'Geist Mono', monospace; font-size: 12.5px; line-height: 1.55;
    padding: 16px 18px; border-radius: 8px; overflow-x: auto;
    border: 1px solid rgba(212,175,55,0.15);
    margin: 8px 0 12px;
    white-space: pre;
  }

  .ad-table-wrap { border: 1px solid var(--borderf); border-radius: 8px; overflow: hidden; }
  .ad-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .ad-table th, .ad-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--borderf); }
  .ad-table th { background: var(--card2); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; }
  .ad-table tr:last-child td { border-bottom: none; }
  .ad-table code { font-family: 'Geist Mono', monospace; font-size: 12px; background: rgba(15,23,42,0.05); padding: 1px 5px; border-radius: 3px; color: var(--brass-2); }

  .ad-list { list-style: none; padding: 0; margin: 0; }
  .ad-list li { padding: 10px 0 10px 20px; position: relative; font-size: 14px; color: var(--text); line-height: 1.55; border-bottom: 1px dashed var(--borderf); }
  .ad-list li:last-child { border-bottom: none; }
  .ad-list li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-family: 'Geist Mono', monospace; font-weight: 800; }
  .ad-list li b { color: var(--brass-2); }
  .ad-list li code { font-family: 'Geist Mono', monospace; font-size: 12px; background: rgba(15,23,42,0.05); padding: 1px 5px; border-radius: 3px; color: var(--brass-2); }

  .ad-bottom-cta { padding: 32px 28px; text-align: center; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-top: 32px; }
  .ad-bottom-cta-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .ad-bottom-cta p { font-size: 14px; color: var(--sub); line-height: 1.6; margin: 0 auto 20px; max-width: 480px; }
  .ad-bottom-cta .ad-cta-row { justify-content: center; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
