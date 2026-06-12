import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"

/**
 * SharedRead — public viewing page for an AI Read shared via URL.
 *
 * Routes: /share/read/:payload
 *
 * The payload is base64url-encoded JSON:
 *   { scope, label, thesis, source, savedAt }
 *
 * No auth required, no Supabase call — the URL IS the data. Pros: zero
 * setup, instant share, no DB. Cons: longer URLs, no analytics, no
 * revocation. For a v1 viral feature, those trade-offs are right.
 *
 * Page is intentionally branded: RizeAI logo, vibrant blue panel, big
 * "Try RizeAI for free →" CTA. Every shared read is a soft ad.
 */

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/")
  while (s.length % 4) s += "="
  try {
    if (typeof atob === "function") return atob(s)
    return Buffer.from(s, "base64").toString("utf8")
  } catch { return null }
}

const SCOPE_META = {
  property:  { label: "PROPERTY READ",    color: "#0066cc" },
  risk:      { label: "RISK ANALYSIS",    color: "#7c3aed" },
  comps:     { label: "COMP MATRIX",      color: "#0066cc" },
  sens:      { label: "SENSITIVITY",      color: "#7c3aed" },
  batch:     { label: "BULK SCREEN",      color: "#ffcc00" },
  scan:      { label: "MARKET TRIGGERS",  color: "#dc2626" },
  portfolio: { label: "PORTFOLIO",        color: "#16a34a" },
}

export default function SharedRead() {
  const { payload } = useParams()
  const [decoded, setDecoded] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const raw = b64urlDecode(payload || "")
    if (!raw) { setError("This share link is malformed."); return }
    try {
      const obj = JSON.parse(raw)
      if (!obj?.thesis) { setError("This share link doesn't contain a valid AI Read."); return }
      setDecoded(obj)
    } catch { setError("This share link couldn't be decoded.") }
  }, [payload])

  const meta = decoded?.scope ? SCOPE_META[decoded.scope] : null
  const dateLabel = decoded?.savedAt
    ? new Date(decoded.savedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "'Geist',sans-serif",
      padding: "48px 20px 80px",
    }}>
      <div style={{
        maxWidth: 680, margin: "0 auto",
      }}>
        {/* Brand bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 32,
        }}>
          <Link to="/" style={{
            fontFamily: "'Geist',sans-serif", fontSize: 20, fontWeight: 800,
            color: "var(--text)", letterSpacing: "-0.5px", textDecoration: "none",
          }}>
            <span style={{ color: "var(--blue)" }}>Rize</span>AI
          </Link>
          <span style={{ fontSize: 13, color: "var(--sub)", marginLeft: 4 }}>· Shared AI Read</span>
        </div>

        {error && (
          <div style={{
            padding: "32px 28px",
            background: "var(--card)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderLeft: "3px solid var(--red)",
            borderRadius: 8,
          }}>
            <div style={{
              fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 700,
              color: "var(--red)", letterSpacing: "1.3px", marginBottom: 8,
            }}>⚠ COULDN'T LOAD THE READ</div>
            <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 18 }}>
              {error}
            </div>
            <Link to="/" style={{
              display: "inline-block",
              background: "var(--blue)", color: "#ffffff",
              padding: "10px 22px", borderRadius: 6,
              fontWeight: 700, textDecoration: "none", fontSize: 13,
            }}>Go to RizeAI →</Link>
          </div>
        )}

        {decoded && (
          <>
            {/* The read itself */}
            <div style={{
              background: "var(--card)",
              border: "1px solid var(--borderf)",
              borderLeft: `3px solid ${meta?.color || "var(--blue)"}`,
              borderRadius: 8,
              padding: "26px 28px", marginBottom: 22,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                flexWrap: "wrap",
              }}>
                {meta && (
                  <span style={{
                    fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 800,
                    color: "#0f172a", background: meta.color,
                    letterSpacing: "1.1px", padding: "3px 9px", borderRadius: 3,
                  }}>
                    {meta.label}
                  </span>
                )}
                {decoded.label && (
                  <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>
                    {decoded.label}
                  </span>
                )}
                {dateLabel && (
                  <span style={{ fontSize: 12, color: "var(--dim)", marginLeft: "auto" }}>
                    {dateLabel}
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700,
                color: meta?.color || "var(--blue)", letterSpacing: "1.3px", marginBottom: 10,
              }}>
                ▸ AI READ
                {decoded.source && decoded.source !== "template" && (
                  <span style={{ color: "var(--dim)", fontWeight: 500, marginLeft: 4 }}>
                    · {decoded.source}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 15, color: "var(--text)", lineHeight: 1.65,
              }}>
                {decoded.thesis}
              </div>
            </div>

            {/* Sign-up CTA */}
            <div style={{
              background: "linear-gradient(180deg, rgba(0,102,204,0.06) 0%, var(--card) 60%)",
              border: "1px solid rgba(0,102,204,0.22)",
              borderRadius: 10,
              padding: "28px 26px", textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Geist Mono',monospace", fontSize: 10.5, fontWeight: 700,
                color: "var(--blue)", letterSpacing: "1.4px", marginBottom: 10,
              }}>
                ▸ POWERED BY RIZEAI
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.6px",
                marginBottom: 10, lineHeight: 1.25,
              }}>
                Get reads like this for any property you analyze.
              </div>
              <div style={{
                fontSize: 14, color: "var(--sub)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto 22px",
              }}>
                RizeAI auto-narrates every property lookup, Monte Carlo run, comp matrix, market scan, and portfolio review. 9 surfaces narrate themselves in 1-2 sentences. Free during launch.
              </div>
              <Link to="/" style={{
                display: "inline-block",
                background: "var(--blue)", color: "#ffffff",
                padding: "12px 28px", borderRadius: 6,
                fontWeight: 800, textDecoration: "none", fontSize: 14,
                letterSpacing: "0.3px",
              }}>Try RizeAI free →</Link>
            </div>

            <div style={{
              marginTop: 20, fontSize: 11.5, color: "var(--dim)",
              textAlign: "center", lineHeight: 1.6,
            }}>
              Shared by a RizeAI user. AI reads are interpretive — verify any specific
              claims (price, address, zoning) before acting.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
