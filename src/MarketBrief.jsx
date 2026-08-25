import { useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "./supabase"
import TopNav from "./components/TopNav"

/**
 * MarketBrief — opt-in management for the daily 8am Pacific RizeAI
 * Market Brief. Each user picks which Canadian markets they want emailed
 * headlines for. The Vercel cron walks market_subscriptions and fires one
 * email per (user, market).
 *
 * Sources are RSS feeds (Bank of Canada, Storeys, Better Dwelling). No
 * scraping — keeps the feature resilient to layout changes.
 */

const MARKETS = [
  { key: "all",       label: "All Canada",     blurb: "Every item we pull — widest funnel." },
  { key: "calgary",   label: "Calgary",        blurb: "+ Airdrie, Cochrane, Okotoks, Chestermere" },
  { key: "vancouver", label: "Vancouver",      blurb: "+ Burnaby, Richmond, Surrey, North/West Van" },
  { key: "edmonton",  label: "Edmonton",       blurb: "+ Sherwood Park, St. Albert, Spruce Grove" },
  { key: "toronto",   label: "Toronto",        blurb: "+ Mississauga, Brampton, Markham, GTA" },
]

const CSS = `
.mb-wrap{max-width:980px;margin:0 auto;padding:32px 20px 80px;font-family:'Geist',sans-serif}
.mb-hero-tag{font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;color:var(--amber);letter-spacing:1.6px;margin-bottom:8px}
.mb-h1{font-size:42px;font-weight:800;color:var(--text);letter-spacing:-1.2px;margin-bottom:14px;line-height:1.05}
.mb-h1 span{color:var(--amber)}
.mb-sub{font-size:15px;color:var(--sub);line-height:1.55;max-width:640px;margin-bottom:36px}
.mb-card{background:var(--card);border:1px solid var(--borderf);border-radius:8px;padding:24px 26px;margin-bottom:18px}
.mb-card-h{font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;color:var(--blue);margin-bottom:10px}
.mb-card-sub{font-size:13px;color:var(--sub);line-height:1.5;margin-bottom:16px}
.mb-market-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.mb-market{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:var(--card2,#f1f5f9);border:1px solid var(--borderf);border-radius:6px;cursor:pointer;transition:border-color 0.15s,background 0.15s}
.mb-market:hover{border-color:rgba(167,130,255,0.4)}
.mb-market.active{border-color:var(--amber);background:rgba(240,160,48,0.06)}
.mb-market input{margin-top:3px;accent-color:var(--amber);flex-shrink:0;cursor:pointer}
.mb-market-label{font-weight:700;font-size:14px;color:var(--text);margin-bottom:3px;display:block}
.mb-market-blurb{font-size:12px;color:var(--sub);line-height:1.45}
.mb-cta-row{display:flex;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap}
.mb-btn{background:var(--amber);color:#ffffff;border:none;border-radius:5px;padding:11px 22px;font-family:'Geist Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:1.1px;cursor:pointer;transition:transform 0.15s}
.mb-btn:hover:not(:disabled){transform:translateY(-1px)}
.mb-btn:disabled{opacity:0.45;cursor:not-allowed}
.mb-btn.ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf)}
.mb-status{font-size:12.5px;font-weight:600;color:var(--green)}
.mb-status.err{color:var(--red)}
.mb-status.dim{color:var(--sub)}

.mb-preview{margin-top:18px;background:var(--card2,#f1f5f9);border:1px solid var(--borderf);border-radius:6px;padding:14px 18px}
.mb-preview-h{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;color:var(--dim);letter-spacing:1.2px;margin-bottom:10px}
.mb-preview-item{padding:10px 0;border-bottom:1px solid rgba(15,23,42,0.04)}
.mb-preview-item:last-child{border-bottom:none}
.mb-preview-source{font-family:'Geist Mono',monospace;font-size:9.5px;font-weight:700;color:var(--blue);letter-spacing:1.1px;margin-bottom:4px}
.mb-preview-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.4;margin-bottom:4px}
.mb-preview-title a{color:var(--text);text-decoration:none}
.mb-preview-title a:hover{color:var(--blue)}
.mb-preview-desc{font-size:12px;color:var(--sub);line-height:1.5}

.mb-signin{padding:24px 26px;background:var(--card);border:1px solid var(--borderf);border-left:3px solid var(--amber);border-radius:8px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.mb-signin-text{font-size:14px;color:var(--text);font-weight:600}

@media (max-width:600px){.mb-h1{font-size:32px}.mb-hero-tag{font-size:10px}.mb-market-list{grid-template-columns:1fr}}
`

export default function MarketBrief() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(new Set())     // markets the user has subscribed to
  const [dirty, setDirty]       = useState(new Set())     // pending additions/removals
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [status, setStatus]     = useState(null)          // { kind: "ok"|"err"|"dim", msg }
  const [previewMarket, setPreviewMarket] = useState("all")
  const [previewItems, setPreviewItems]   = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [lastSent, setLastSent] = useState(null)          // most recent last_sent_at across the user's subs
  const [showDiag, setShowDiag] = useState(false)         // collapsed by default — only auto-open if a check fails

  // Setup diagnostic — probes each piece of the pipeline so the user can
  // see green checks land as they wire env vars tonight. Auto-runs once on
  // mount; "RE-RUN" rebuilds the report.
  const [diag, setDiag] = useState({ running: false, ran: false, checks: [] })
  async function runDiagnostic() {
    setDiag(d => ({ ...d, running: true, ran: true }))
    const checks = []

    // 1. RSS feeds responding
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fetch-market-brief", market: "all" }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && Array.isArray(j.items)) {
        checks.push({ key: "rss", ok: j.items.length > 0, label: "RSS feeds responding", detail: `${j.items.length} item${j.items.length === 1 ? "" : "s"} from ${j.sources?.length || 0} source${j.sources?.length === 1 ? "" : "s"}`, fix: null })
      } else {
        checks.push({ key: "rss", ok: false, label: "RSS feeds responding", detail: j.error || `HTTP ${r.status}`, fix: "Endpoint is reachable but the AI chat handler returned an error. Check Vercel logs." })
      }
    } catch (e) {
      checks.push({ key: "rss", ok: false, label: "RSS feeds responding", detail: e.message, fix: "Endpoint unreachable — is the deploy live?" })
    }

    // 2. Resend configured (probe send-market-brief; 503 = not configured)
    if (user?.email) {
      try {
        // Use a deliberately-invalid recipient to trigger a fast Resend response
        // without spamming the user's inbox — Resend rejects malformed and we
        // can read the response status to infer the key is configured.
        const r = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "send-market-brief", to: "probe@example.invalid", market: "all" }),
        })
        const j = await r.json().catch(() => ({}))
        if (r.status === 503) {
          checks.push({ key: "resend", ok: false, label: "Resend (email service)", detail: "RESEND_API_KEY not set", fix: "Add RESEND_API_KEY + RESEND_FROM_EMAIL to Vercel env vars." })
        } else if (r.status === 502) {
          checks.push({ key: "resend", ok: "partial", label: "Resend (email service)", detail: "API key wired; Resend rejected the test send (likely sender domain not verified)", fix: "Verify your sending domain at resend.com → Domains, or start with onboarding@resend.dev." })
        } else if (r.ok || j.ok) {
          checks.push({ key: "resend", ok: true, label: "Resend (email service)", detail: "API key wired + accepting sends", fix: null })
        } else {
          checks.push({ key: "resend", ok: false, label: "Resend (email service)", detail: j.error || `HTTP ${r.status}`, fix: "Unexpected error — check Vercel logs." })
        }
      } catch (e) {
        checks.push({ key: "resend", ok: false, label: "Resend (email service)", detail: e.message, fix: null })
      }
    } else {
      checks.push({ key: "resend", ok: "skip", label: "Resend (email service)", detail: "Sign in to probe", fix: null })
    }

    // 3. Cron handler reachable + CRON_SECRET configured
    try {
      const r = await fetch("/api/ai-chat?mode=cron-market-brief", { method: "GET" })
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) {
        checks.push({ key: "cron", ok: true, label: "Cron auth (CRON_SECRET)", detail: "CRON_SECRET configured (endpoint correctly rejects unauthed)", fix: null })
      } else if (r.status === 503 && /supabase/i.test(j.error || "")) {
        checks.push({ key: "cron", ok: "partial", label: "Cron auth (CRON_SECRET)", detail: "Auth missing — got Supabase error instead of 401", fix: "Set CRON_SECRET in Vercel env vars + enable Cron Jobs in project settings." })
      } else {
        checks.push({ key: "cron", ok: false, label: "Cron auth (CRON_SECRET)", detail: `Unexpected HTTP ${r.status}`, fix: "Enable Cron Jobs in Vercel project settings." })
      }
    } catch (e) {
      checks.push({ key: "cron", ok: false, label: "Cron auth (CRON_SECRET)", detail: e.message, fix: null })
    }

    // 4. Supabase subscriptions table (probe — requires sign-in)
    if (user?.id) {
      try {
        const { error } = await supabase
          .from("market_subscriptions")
          .select("id", { count: "exact", head: true })
          .limit(1)
        if (error) {
          if (/relation.*does not exist|table.*not found/i.test(error.message)) {
            checks.push({ key: "supabase", ok: false, label: "Supabase market_subscriptions table", detail: "Table doesn't exist", fix: "Run supabase/migrations/002_market_subscriptions.sql in your Supabase SQL editor." })
          } else {
            checks.push({ key: "supabase", ok: false, label: "Supabase market_subscriptions table", detail: error.message, fix: null })
          }
        } else {
          checks.push({ key: "supabase", ok: true, label: "Supabase market_subscriptions table", detail: "Table reachable + RLS responding", fix: null })
        }
      } catch (e) {
        checks.push({ key: "supabase", ok: false, label: "Supabase market_subscriptions table", detail: e.message, fix: null })
      }
    } else {
      checks.push({ key: "supabase", ok: "skip", label: "Supabase market_subscriptions table", detail: "Sign in to probe", fix: null })
    }

    setDiag({ running: false, ran: true, checks })
    // Auto-open the diagnostic only if something's broken. Healthy setups stay
    // collapsed so the page leads with the subscription UI, not an ops panel.
    if (checks.some(c => c.ok !== true && c.ok !== "skip")) setShowDiag(true)
  }
  useEffect(() => { runDiagnostic() }, [user?.id])

  // Load existing subscriptions + most-recent last_sent_at so users see
  // "Last brief sent X hours ago" right at the top.
  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("market_subscriptions")
        .select("market, enabled, last_sent_at")
        .eq("enabled", true)
      if (cancelled) return
      if (error) { setStatus({ kind: "err", msg: error.message }); setLoading(false); return }
      setSelected(new Set((data || []).map(r => r.market)))
      const latest = (data || [])
        .map(r => r.last_sent_at)
        .filter(Boolean)
        .sort()
        .pop();
      setLastSent(latest || null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

  // Friendly "X hours ago" / "Yesterday" / "Mon at 8:00am" formatter for the
  // last-sent badge. Avoids depending on date-fns.
  function formatRelative(iso) {
    if (!iso) return null
    const then = new Date(iso)
    const diffMs = Date.now() - then.getTime()
    if (diffMs < 0) return then.toLocaleString("en-CA")
    const hours = Math.floor(diffMs / 3_600_000)
    const days = Math.floor(diffMs / 86_400_000)
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return then.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
  }

  function toggle(market) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(market)) next.delete(market)
      else next.add(market)
      return next
    })
    setDirty(d => new Set(d).add(market))
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setStatus(null)
    try {
      // For each dirty market: upsert (enabled=true) if selected, or disable if unselected.
      const ops = [...dirty].map(async market => {
        if (selected.has(market)) {
          // Upsert: insert or set enabled=true
          const { error } = await supabase
            .from("market_subscriptions")
            .upsert({ user_id: user.id, market, enabled: true }, { onConflict: "user_id,market" })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from("market_subscriptions")
            .update({ enabled: false })
            .eq("user_id", user.id)
            .eq("market", market)
          if (error) throw error
        }
      })
      await Promise.all(ops)
      setDirty(new Set())
      setStatus({ kind: "ok", msg: `Saved · subscribed to ${selected.size} market${selected.size === 1 ? "" : "s"}` })
      setTimeout(() => setStatus(null), 4500)
    } catch (e) {
      setStatus({ kind: "err", msg: e.message })
      setTimeout(() => setStatus(null), 6000)
    } finally {
      setSaving(false)
    }
  }

  async function loadPreview() {
    setPreviewLoading(true)
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fetch-market-brief", market: previewMarket }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`)
      setPreviewItems(j.items || [])
    } catch (e) {
      setStatus({ kind: "err", msg: e.message })
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function sendTest() {
    if (!user?.email) return
    setSendingTest(true)
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send-market-brief", to: user.email, market: previewMarket }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) throw new Error(j.error || `Failed (${r.status})`)
      setStatus({ kind: "ok", msg: `Test brief sent to ${user.email}` })
      setTimeout(() => setStatus(null), 5000)
    } catch (e) {
      setStatus({ kind: "err", msg: e.message })
      setTimeout(() => setStatus(null), 6000)
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <>
      <TopNav />
      <style>{CSS}</style>
      <div className="mb-wrap">
        <div className="mb-hero-tag">▸ DAILY · 8AM PACIFIC</div>
        <h1 className="mb-h1">The <span>RizeAI</span> Brief.</h1>
        <p className="mb-sub">
          Each morning at 8am Pacific we pull the latest Bank of Canada announcements, Storeys, and Better
          Dwelling — filter to the markets you care about — and email a tight digest you can read with your
          coffee. No fluff, source links only, unsubscribe with one click.
        </p>

        {!user ? (
          <div className="mb-signin">
            <span className="mb-signin-text">Sign in to subscribe — we save your picks to your account so the cron can find them.</span>
            <a href="/login" className="mb-btn" style={{ textDecoration: "none", display: "inline-block" }}>SIGN IN →</a>
          </div>
        ) : (
          <>
            {/* Subscription status banner — visible when user has any active sub */}
            {!loading && selected.size > 0 && (
              <div style={{
                background: "linear-gradient(135deg,rgba(33,85,205,0.06),rgba(240,160,48,0.05))",
                border: "1px solid var(--borderf)",
                borderLeft: "3px solid var(--green, #16a34a)",
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 8px #22c55e",
                  flexShrink: 0,
                }} />
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                  Subscribed to <strong>{selected.size} market{selected.size === 1 ? "" : "s"}</strong>
                  {" · "}
                  {lastSent
                    ? <span style={{ color: "var(--sub)", fontWeight: 500 }}>Last brief sent <strong style={{ color: "var(--text)" }}>{formatRelative(lastSent)}</strong></span>
                    : <span style={{ color: "var(--sub)", fontWeight: 500 }}>Next brief tomorrow 8am Pacific</span>}
                </div>
              </div>
            )}

            {/* PICK YOUR MARKETS — the primary subscription UI (moved to top) */}
            <div className="mb-card">
              <div className="mb-card-h">▸ PICK YOUR MARKETS</div>
              <div className="mb-card-sub">Select one or more — "All Canada" includes every item; city markets filter by name + metro suburbs.</div>
              {loading ? (
                <div style={{ fontSize: 13, color: "var(--sub)" }}>Loading your subscriptions…</div>
              ) : (
                <div className="mb-market-list">
                  {MARKETS.map(m => {
                    const active = selected.has(m.key)
                    return (
                      <label key={m.key} className={`mb-market ${active ? "active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggle(m.key)}
                        />
                        <span>
                          <span className="mb-market-label">{m.label}</span>
                          <span className="mb-market-blurb">{m.blurb}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              <div className="mb-cta-row">
                <button className="mb-btn" onClick={save} disabled={saving || dirty.size === 0}>
                  {saving ? "SAVING…" : dirty.size === 0 ? "✓ UP TO DATE" : `SAVE ${dirty.size} CHANGE${dirty.size === 1 ? "" : "S"}`}
                </button>
                {status && <span className={`mb-status ${status.kind === "err" ? "err" : status.kind === "dim" ? "dim" : ""}`}>{status.msg}</span>}
              </div>
            </div>

            <div className="mb-card">
              <div className="mb-card-h">▸ PREVIEW · WHAT TODAY'S BRIEF LOOKS LIKE</div>
              <div className="mb-card-sub">
                Fetch the live RSS aggregation for any market to see what would be sent. Optionally email yourself a test copy.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <select
                  value={previewMarket}
                  onChange={e => { setPreviewMarket(e.target.value); setPreviewItems(null) }}
                  style={{
                    background: "var(--card2,#f1f5f9)", color: "var(--text)",
                    border: "1px solid var(--borderf)", borderRadius: 5,
                    padding: "9px 14px",
                    fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.8px",
                  }}
                >
                  {MARKETS.map(m => <option key={m.key} value={m.key}>{m.label.toUpperCase()}</option>)}
                </select>
                <button className="mb-btn ghost" onClick={loadPreview} disabled={previewLoading}>
                  {previewLoading ? "FETCHING…" : "▶ PREVIEW"}
                </button>
                <button className="mb-btn ghost" onClick={sendTest} disabled={sendingTest || !user?.email}>
                  {sendingTest ? "SENDING…" : "📧 EMAIL ME A TEST"}
                </button>
              </div>
              {previewItems && previewItems.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
                  No items matched — feeds may be slow or the market is quiet today.
                </div>
              )}
              {previewItems && previewItems.length > 0 && (
                <div className="mb-preview">
                  <div className="mb-preview-h">▸ {previewItems.length} ITEMS · LIVE FROM RSS</div>
                  {previewItems.map((it, i) => (
                    <div key={i} className="mb-preview-item">
                      <div className="mb-preview-source">{it.source.toUpperCase()}</div>
                      <div className="mb-preview-title"><a href={it.link} target="_blank" rel="noopener noreferrer">{it.title}</a></div>
                      {it.description && <div className="mb-preview-desc">{it.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.6, marginTop: 18 }}>
              Sources: Bank of Canada · Storeys · Better Dwelling. All public RSS feeds — RizeAI aggregates and filters but does not modify content. Verify each item before acting.
            </div>

            {/* ── COLLAPSIBLE SETUP DIAGNOSTIC ── Hidden by default. Auto-opens
                if a check fails on mount. Users see this as "Setup status"
                rather than a wall of ops checks dominating the page. */}
            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setShowDiag(v => !v)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--borderf)",
                  borderRadius: 5,
                  padding: "8px 14px",
                  fontFamily: "'Geist Mono',monospace",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  color: "var(--sub)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {(() => {
                  const failing = diag.checks.filter(c => c.ok !== true && c.ok !== "skip").length
                  const glyph = failing ? "▲" : "✓"
                  const color = failing ? "var(--amber)" : "var(--green, #16a34a)"
                  return (
                    <>
                      <span style={{ color, fontWeight: 800 }}>{glyph}</span>
                      Setup status: {failing ? `${failing} check${failing === 1 ? "" : "s"} need attention` : "all systems wired"}
                      <span style={{ color: "var(--dim)", marginLeft: 6 }}>{showDiag ? "[hide]" : "[show]"}</span>
                    </>
                  )
                })()}
              </button>
              {showDiag && (
                <div className="mb-card" style={{ borderLeft: "3px solid var(--amber)", marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <div className="mb-card-h" style={{ marginBottom: 0, color: "var(--amber)" }}>▸ SETUP DIAGNOSTIC</div>
                    <button
                      onClick={runDiagnostic}
                      disabled={diag.running}
                      style={{
                        marginLeft: "auto",
                        background: "transparent", color: "var(--sub)",
                        border: "1px solid var(--borderf)", borderRadius: 4,
                        padding: "5px 11px",
                        fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.8px", cursor: diag.running ? "wait" : "pointer",
                      }}
                    >
                      {diag.running ? "PROBING…" : "↻ RE-RUN"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {diag.checks.map(c => {
                      const color = c.ok === true ? "var(--green)" : c.ok === "partial" ? "var(--amber)" : c.ok === "skip" ? "var(--dim)" : "var(--red)"
                      const glyph = c.ok === true ? "✓" : c.ok === "partial" ? "◐" : c.ok === "skip" ? "·" : "✗"
                      return (
                        <div key={c.key} style={{
                          display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10,
                          padding: "8px 12px",
                          background: "var(--card2,#f1f5f9)",
                          border: "1px solid var(--borderf)",
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 4, alignItems: "start",
                        }}>
                          <div style={{ color, fontFamily: "'Geist Mono',monospace", fontSize: 14, fontWeight: 800, lineHeight: 1.4 }}>{glyph}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{c.label}</div>
                            <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.4 }}>{c.detail}</div>
                            {c.fix && (
                              <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4, lineHeight: 1.4 }}>
                                <strong>Fix:</strong> {c.fix}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {diag.running && diag.checks.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--sub)", padding: 8 }}>Running probes…</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
