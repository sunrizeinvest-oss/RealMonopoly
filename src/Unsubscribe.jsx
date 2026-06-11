import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"

/**
 * Unsubscribe — one-click compliance page for RizeAI digest emails.
 *
 * No auth required — the signed token in the URL IS the auth. Hits
 * /api/ai-chat?mode=unsubscribe with the token; the server verifies the
 * HMAC against CRON_SECRET, decodes the user_id + market, and flips
 * `enabled=false` on the matching market_subscriptions row(s).
 *
 * UX: a single state-flow page — running → success | failed. No forms,
 * no questions, no confirmation step. RFC 8058 / CAN-SPAM intent.
 */

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get("token") || ""
  const [state, setState] = useState({ phase: "running", market: null, error: null, affected: 0 })

  useEffect(() => {
    if (!token) { setState({ phase: "failed", error: "Missing token." }); return }
    fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "unsubscribe", token }),
    })
      .then(r => r.json().then(j => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (!j?.ok) {
          setState({ phase: "failed", error: j?.error || `HTTP ${status}` })
        } else {
          setState({ phase: "success", market: j.market, affected: j.affected || 0 })
        }
      })
      .catch(e => setState({ phase: "failed", error: e.message }))
  }, [token])

  const marketLabel = (() => {
    if (!state.market || state.market === "*") return "every market"
    return state.market.charAt(0).toUpperCase() + state.market.slice(1)
  })()

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 20px",
      fontFamily: "'Geist',sans-serif",
    }}>
      <div style={{
        maxWidth: 520, width: "100%",
        background: "var(--card)",
        border: "1px solid var(--borderf)",
        borderRadius: 10,
        padding: "36px 32px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 700,
          color: "var(--blue)", letterSpacing: "1.6px", marginBottom: 18,
        }}>▸ RIZEAI · UNSUBSCRIBE</div>

        {state.phase === "running" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              Removing you from the list…
            </div>
            <div style={{ fontSize: 14, color: "var(--sub)" }}>Just a moment.</div>
          </>
        )}

        {state.phase === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              You're unsubscribed from {marketLabel}.
            </div>
            <div style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.6, marginBottom: 24 }}>
              You won't receive any more emails for {marketLabel === "every market" ? "any RizeAI market brief" : `the ${marketLabel} brief`}.
              {state.affected > 0 && state.market === "*" ? ` ${state.affected} subscription${state.affected === 1 ? "" : "s"} disabled.` : ""}
            </div>
            <Link to="/market-brief" style={{
              display: "inline-block",
              background: "var(--blue)", color: "#ffffff",
              textDecoration: "none", fontWeight: 700,
              padding: "10px 22px", borderRadius: 6,
              fontSize: 13, letterSpacing: "0.5px",
            }}>Manage other subscriptions →</Link>
          </>
        )}

        {state.phase === "failed" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12, color: "var(--red)" }}>⚠</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              Couldn't unsubscribe automatically.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--sub)", lineHeight: 1.6, marginBottom: 24 }}>
              {state.error}<br />
              The link may have expired (links valid for 90 days). Sign in and manage your subscriptions from /market-brief.
            </div>
            <Link to="/market-brief" style={{
              display: "inline-block",
              background: "var(--blue)", color: "#ffffff",
              textDecoration: "none", fontWeight: 700,
              padding: "10px 22px", borderRadius: 6,
              fontSize: 13, letterSpacing: "0.5px",
            }}>Manage manually →</Link>
          </>
        )}
      </div>
    </div>
  )
}
