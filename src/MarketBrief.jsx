import { useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "./supabase"
import TopNav from "./components/TopNav"

/**
 * MarketBrief — opt-in management for the daily 8am Pacific Real Deal
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
.mb-market{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:var(--card2,#0a0e18);border:1px solid var(--borderf);border-radius:6px;cursor:pointer;transition:border-color 0.15s,background 0.15s}
.mb-market:hover{border-color:rgba(167,130,255,0.4)}
.mb-market.active{border-color:var(--amber);background:rgba(240,160,48,0.06)}
.mb-market input{margin-top:3px;accent-color:var(--amber);flex-shrink:0;cursor:pointer}
.mb-market-label{font-weight:700;font-size:14px;color:var(--text);margin-bottom:3px;display:block}
.mb-market-blurb{font-size:12px;color:var(--sub);line-height:1.45}
.mb-cta-row{display:flex;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap}
.mb-btn{background:var(--amber);color:#07090f;border:none;border-radius:5px;padding:11px 22px;font-family:'Geist Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:1.1px;cursor:pointer;transition:transform 0.15s}
.mb-btn:hover:not(:disabled){transform:translateY(-1px)}
.mb-btn:disabled{opacity:0.45;cursor:not-allowed}
.mb-btn.ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf)}
.mb-status{font-size:12.5px;font-weight:600;color:var(--green)}
.mb-status.err{color:var(--red)}
.mb-status.dim{color:var(--sub)}

.mb-preview{margin-top:18px;background:var(--card2,#0a0e18);border:1px solid var(--borderf);border-radius:6px;padding:14px 18px}
.mb-preview-h{font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;color:var(--dim);letter-spacing:1.2px;margin-bottom:10px}
.mb-preview-item{padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
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

  // Load existing subscriptions
  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("market_subscriptions")
        .select("market, enabled")
        .eq("enabled", true)
      if (cancelled) return
      if (error) { setStatus({ kind: "err", msg: error.message }); setLoading(false); return }
      setSelected(new Set((data || []).map(r => r.market)))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

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
        <h1 className="mb-h1">The <span>Real Deal</span> Brief.</h1>
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
                    background: "var(--card2,#0a0e18)", color: "var(--text)",
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
              Sources: Bank of Canada · Storeys · Better Dwelling. All public RSS feeds — Real Deal aggregates and filters but does not modify content. Verify each item before acting.
            </div>
          </>
        )}
      </div>
    </>
  )
}
