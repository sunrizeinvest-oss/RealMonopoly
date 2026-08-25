/**
 * Admin dashboard — internal ops view.
 *
 * Visibility: gated by the server (ADMIN_EMAILS allowlist). If the JWT's
 * email isn't on the list, the API returns 403 and we render an explicit
 * "Forbidden" message instead of any data.
 *
 * Renders:
 *   - 5 KPI tiles: total users · signups-24h · signups-7d · active-7d · active-30d
 *   - Plan distribution + MRR card
 *   - Total saved deals
 *   - Recent users table (newest 50)
 *   - Generated-at timestamp + refresh
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabase";
import TopNav from "./components/TopNav";

const fmt$ = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";
const fmtN = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

function formatAge(iso) {
  if (!iso) return "—";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshAt, setRefreshAt] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No session token — please sign in again.");
        const r = await fetch("/api/ai-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({ mode: "admin-dashboard" }),
        });
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setErr(json?.error || `Request failed (${r.status})`);
          setData(null);
        } else {
          setData(json);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, refreshAt, navigate]);

  const sortedUsers = useMemo(() => {
    const list = data?.recentUsers || [];
    const q = userSearch.trim().toLowerCase();
    return list.filter(u => {
      if (planFilter !== "all" && u.plan !== planFilter) return false;
      if (q && !u.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, userSearch, planFilter]);

  return (
    <>
      <TopNav />
      <style>{`
        /* Mobile responsive overrides for the Admin dashboard. Inline styles
           on the grids would force JS-driven resize listeners; a small CSS
           class-targeted rule is cleaner. */
        @media (max-width: 720px) {
          .admin-root              { padding: 16px 14px 60px !important }
          .admin-plans-row         { grid-template-columns: 1fr !important }
          .admin-table-wrap        { overflow-x: auto !important; -webkit-overflow-scrolling: touch }
          .admin-table             { min-width: 600px }
          .admin-kpi-strip         { grid-template-columns: repeat(2, 1fr) !important }
        }
        @media (max-width: 480px) {
          .admin-kpi-strip         { grid-template-columns: 1fr !important }
        }
      `}</style>
      <div className="admin-root" style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px 80px",fontFamily:"'Geist',sans-serif"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:11,fontWeight:700,letterSpacing:"1.4px",color:"var(--gold)",textTransform:"uppercase"}}>
              ▸ Internal · admin
            </div>
            <h1 style={{margin:"4px 0 0",fontSize:30,fontWeight:800,letterSpacing:"-1.2px"}}>RizeAI control room</h1>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:6}}>
              {data?.generatedAt ? `Snapshot · ${new Date(data.generatedAt).toLocaleString()}` : "Loading…"}
            </div>
          </div>
          <button
            onClick={() => setRefreshAt(Date.now())}
            disabled={loading}
            style={{
              background:"var(--blue)",color:"#fff",border:"none",
              borderRadius:6,padding:"10px 18px",fontFamily:"'Geist Mono',monospace",
              fontSize:11,fontWeight:700,letterSpacing:"1px",cursor:"pointer",
              textTransform:"uppercase",opacity:loading?0.55:1,
            }}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {err && (
          <div style={{margin:"24px 0",padding:"16px 18px",background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.3)",borderLeft:"3px solid var(--red)",borderRadius:6,color:"var(--text)",fontSize:14,lineHeight:1.55}}>
            <strong style={{color:"var(--red)"}}>{err.includes("Forbidden") ? "Access denied" : "Error"}</strong>
            <div style={{marginTop:6,color:"var(--sub)"}}>{err}</div>
            {err.includes("ADMIN_EMAILS") && (
              <div style={{marginTop:10,fontSize:12,color:"var(--dim)",fontFamily:"'Geist Mono',monospace"}}>
                Set the env var in Vercel: ADMIN_EMAILS=you@example.com,other@example.com → redeploy.
              </div>
            )}
          </div>
        )}

        {loading && !data && (
          <div style={{textAlign:"center",padding:"60px 0",color:"var(--sub)",fontFamily:"'Geist Mono',monospace",fontSize:13}}>
            Reading users + subscriptions + saved-deals counts from Supabase…
          </div>
        )}

        {data && (
          <>
            {/* KPI strip */}
            <div className="admin-kpi-strip" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:10,marginTop:24,marginBottom:18}}>
              <Kpi label="Total users"        value={fmtN(data.stats.totalUsers)}     accent="var(--gold)" />
              <Kpi label="Signups · 24h"      value={fmtN(data.stats.signupsLast24h)} accent="var(--green)" />
              <Kpi label="Signups · 7d"       value={fmtN(data.stats.signupsLast7d)}  accent="var(--green)" />
              <Kpi label="Active · 7d"        value={fmtN(data.stats.activeLast7d)}   accent="var(--blue)" />
              <Kpi label="Active · 30d"       value={fmtN(data.stats.activeLast30d)}  accent="var(--blue)" />
              <Kpi label="Confirmed"          value={`${data.stats.confirmationRate ?? 0}%`} accent="var(--purple)" />
            </div>

            {/* Signup trend sparkline — last 14 days */}
            {data.stats.signupSparkline && (
              <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,padding:"16px 18px 14px",marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:12,flexWrap:"wrap"}}>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>
                    Signups · last 14 days
                  </div>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:12,color:"var(--text)"}}>
                    {fmtN(data.stats.signupsLast30d || 0)} <span style={{color:"var(--dim)"}}>over 30d</span>
                  </div>
                </div>
                <Sparkline values={data.stats.signupSparkline} />
              </div>
            )}

            {/* Churn signals — dormant + never-signed-in */}
            {(data.churn?.dormantCount > 0 || data.churn?.neverSignedInCount > 0) && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
                <ChurnCard
                  title="Dormant users"
                  count={data.churn.dormantCount}
                  subtitle="confirmed, signed in once, but quiet for 30d+"
                  list={data.churn.dormantTop5}
                  metaFmt={u => `last seen ${formatAge(u.lastSignInAt)}`}
                  accent="var(--amber)"
                />
                <ChurnCard
                  title="Never signed in"
                  count={data.churn.neverSignedInCount}
                  subtitle="confirmed email, but never logged in"
                  list={data.churn.neverSignedInTop5}
                  metaFmt={u => `signed up ${formatAge(u.signedUpAt)}`}
                  accent="var(--red)"
                />
              </div>
            )}

            {/* Plans + revenue + deals row */}
            <div className="admin-plans-row" style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:24}}>
              <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,padding:"18px 20px"}}>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase",marginBottom:10}}>Plan distribution</div>
                <PlanBars plans={data.plans} />
                <div style={{display:"flex",gap:18,marginTop:14,fontFamily:"'Geist Mono',monospace",fontSize:12.5}}>
                  <span><strong>{fmtN(data.plans.free)}</strong> free</span>
                  <span style={{color:"var(--blue)"}}><strong>{fmtN(data.plans.pro)}</strong> pro</span>
                  <span style={{color:"var(--gold)"}}><strong>{fmtN(data.plans.scale)}</strong> scale</span>
                </div>
              </div>
              <div style={{background:"linear-gradient(180deg,rgba(212,175,55,0.06),var(--card))",border:"1px solid rgba(212,175,55,0.32)",borderLeft:"3px solid var(--gold)",borderRadius:8,padding:"18px 20px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--gold)",textTransform:"uppercase",marginBottom:6}}>Est. MRR</div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:32,fontWeight:800,color:"var(--text)",letterSpacing:"-1px",lineHeight:1}}>{fmt$(data.plans.mrr)}</div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:6,fontFamily:"'Geist Mono',monospace"}}>
                  {data.plans.pro}×$99 + {data.plans.scale}×$299
                </div>
                <div style={{borderTop:"1px dashed var(--borderf)",margin:"14px 0 10px"}}/>
                <div style={{fontSize:12,color:"var(--sub)"}}>
                  <strong style={{color:"var(--text)"}}>{fmtN(data.deals.totalSavedDeals)}</strong> total saved deals
                </div>
              </div>
            </div>

            {/* Client-side error log — surfaces browser JS errors captured by
                src/lib/errors.js. Silent when none = nice signal. Shows the
                last 24h count + top 5 routes and up to 8 recent errors. */}
            {data.errors && (data.errors.recent.length > 0 || data.errors.last24hCount > 0) && (
              <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,padding:"16px 18px",marginBottom:18,borderLeft:"3px solid var(--red)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>
                    Client-side errors · browser JS
                  </div>
                  <div style={{display:"flex",gap:14,alignItems:"center",fontFamily:"'Geist Mono',monospace",fontSize:11}}>
                    {data.errors.last24hCount > 0 && (
                      <span style={{
                        color:"var(--red)",fontWeight:800,
                        background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.3)",
                        padding:"3px 9px",borderRadius:3,
                      }}>
                        ▸ {data.errors.last24hCount} · 24H
                      </span>
                    )}
                    <span style={{color:"var(--dim)"}}>{data.errors.recent.length} total shown</span>
                  </div>
                </div>
                {data.errors.topRoutes.length > 0 && (
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {data.errors.topRoutes.map(({route, count}) => (
                      <span key={route} style={{
                        fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"0.4px",
                        color:"var(--red)",background:"rgba(220,38,38,0.06)",
                        border:"1px solid rgba(220,38,38,0.22)",
                        padding:"3px 8px",borderRadius:3,
                      }}>
                        {route} · {count}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {data.errors.recent.slice(0, 8).map(e => (
                    <div key={e.id} style={{
                      padding:"8px 10px",background:"rgba(220,38,38,0.03)",
                      border:"1px solid rgba(220,38,38,0.15)",borderLeft:"2px solid var(--red)",
                      borderRadius:4,
                    }}>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,fontWeight:700,color:"var(--red)",letterSpacing:"0.2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {e.message}
                      </div>
                      <div style={{fontSize:10.5,color:"var(--dim)",marginTop:3,fontFamily:"'Geist Mono',monospace"}}>
                        {e.route} · {e.mechanism} · {formatAge(e.occurred_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leads card — captured emails from the Landing design-partner
                form (and future surfaces). Surfaces unread count + most-
                recent submissions so the founder can act on them. */}
            {data.leads && (
              <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,padding:"16px 18px",marginBottom:18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>
                    Leads · captured from landing forms
                  </div>
                  <div style={{display:"flex",gap:14,alignItems:"center",fontFamily:"'Geist Mono',monospace",fontSize:11}}>
                    {data.leads.newCount > 0 && (
                      <span style={{
                        color:"var(--green)",fontWeight:800,
                        background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.3)",
                        padding:"3px 9px",borderRadius:3,
                      }}>
                        ▸ {data.leads.newCount} NEW
                      </span>
                    )}
                    <span style={{color:"var(--dim)"}}>
                      {data.leads.totalCount} total · last 25 shown
                    </span>
                  </div>
                </div>
                {Object.keys(data.leads.bySource).length > 0 && (
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {Object.entries(data.leads.bySource).map(([src, n]) => (
                      <span key={src} style={{
                        fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"0.6px",
                        color:"var(--gold)",background:"rgba(212,175,55,0.08)",
                        border:"1px solid rgba(212,175,55,0.25)",
                        padding:"3px 8px",borderRadius:3,textTransform:"uppercase",
                      }}>
                        {src} · {n}
                      </span>
                    ))}
                  </div>
                )}
                {data.leads.recent.length === 0 ? (
                  <div style={{fontSize:12.5,color:"var(--dim)",fontStyle:"italic",padding:"14px 0"}}>
                    No leads yet · the design-partner form on Landing will write here once visitors submit.
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {data.leads.recent.slice(0, 8).map(l => (
                      <div key={l.id} style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
                        padding:"8px 10px",background:"rgba(0,0,0,0.025)",
                        border:"1px solid var(--borderf)",
                        borderLeft: l.status === "new" ? "3px solid var(--green)" : "3px solid transparent",
                        borderRadius:4,
                      }}>
                        <div style={{flex:1,minWidth:0,fontFamily:"'Geist Mono',monospace",fontSize:11.5}}>
                          <div style={{color:"var(--text)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {l.email}{l.name && <span style={{color:"var(--sub)",fontWeight:500,marginLeft:6}}>· {l.name}</span>}
                          </div>
                          <div style={{color:"var(--dim)",fontSize:10.5,marginTop:2}}>
                            {l.source}{l.intent && ` · ${l.intent}`} · {formatAge(l.created_at)}
                          </div>
                          {l.message && (
                            <div style={{color:"var(--sub)",fontSize:11,marginTop:4,fontStyle:"italic",lineHeight:1.4}}>
                              "{l.message.length > 110 ? l.message.slice(0, 110) + "…" : l.message}"
                            </div>
                          )}
                        </div>
                        <a
                          href={`mailto:${l.email}?subject=Re%3A%20${encodeURIComponent(l.source)}%20application`}
                          style={{
                            fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:800,letterSpacing:"0.6px",
                            color:"var(--gold)",textDecoration:"none",
                            border:"1px solid var(--gold)",borderRadius:3,
                            padding:"4px 9px",textTransform:"uppercase",flexShrink:0,
                          }}
                        >
                          ▸ Reply
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cron health — silent failure detector. Shows last run + duration
                + status for each scheduled job. Empty if migration 004 hasn't
                been run yet. */}
            <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,padding:"16px 18px",marginBottom:18}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>
                  Cron health · last run per job
                </div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10.5,color:"var(--dim)"}}>
                  schedules → vercel.json
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10}}>
                {[
                  ["cron-digest",        "Weekly market triggers · Mon 16:00 UTC"],
                  ["cron-market-brief",  "Daily RSS brief · 15:00 UTC"],
                  ["cron-daily-alerts",  "Daily deal alerts · 13:00 UTC"],
                ].map(([name, schedule]) => {
                  const run = data.crons?.[name];
                  const status = run?.status || "no-data";
                  const color =
                    status === "success" ? "var(--green)" :
                    status === "error"   ? "var(--red)"   :
                    status === "running" ? "var(--amber)" :
                                           "var(--dim)";
                  const lastRunAt = run?.started_at;
                  return (
                    <div key={name} style={{padding:"12px 14px",background:"rgba(0,0,0,0.04)",border:"1px solid var(--borderf)",borderLeft:`3px solid ${color}`,borderRadius:6}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}>
                        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,fontWeight:700,color:"var(--text)",letterSpacing:"0.3px"}}>
                          {name}
                        </div>
                        <div style={{
                          fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,letterSpacing:"1px",
                          color,textTransform:"uppercase",padding:"2px 6px",border:`1px solid ${color}`,borderRadius:3,
                        }}>
                          {status}
                        </div>
                      </div>
                      <div style={{fontSize:10.5,color:"var(--dim)",fontFamily:"'Geist Mono',monospace",marginBottom:6,letterSpacing:"0.2px"}}>
                        {schedule}
                      </div>
                      {lastRunAt ? (
                        <div style={{fontSize:11.5,color:"var(--sub)",fontFamily:"'Geist Mono',monospace"}}>
                          <div>last: {formatDate(lastRunAt)} <span style={{color:"var(--dim)"}}>· {formatAge(lastRunAt)}</span></div>
                          {run.duration_ms != null && (
                            <div style={{marginTop:3}}>duration: <strong style={{color:"var(--text)"}}>{run.duration_ms}ms</strong></div>
                          )}
                          {run.result_summary && Object.keys(run.result_summary).length > 0 && (
                            <div style={{marginTop:3,color:"var(--dim)",fontSize:10.5}}>
                              {Object.entries(run.result_summary).map(([k, v]) => `${k}:${v}`).join(" · ")}
                            </div>
                          )}
                          {run.error_msg && (
                            <div style={{marginTop:4,color:"var(--red)",fontSize:10.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              ⚠ {run.error_msg}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{fontSize:11,color:"var(--dim)",fontStyle:"italic"}}>
                          no runs logged yet · run supabase/migrations/004_cron_runs.sql to enable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent users */}
            <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",background:"var(--card2)",borderBottom:"1px solid var(--borderf)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>
                  Recent users · {sortedUsers.length} shown{userSearch || planFilter !== "all" ? " (filtered)" : ""}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search email…"
                    style={{padding:"6px 10px",fontSize:12,fontFamily:"'Geist Mono',monospace",background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:4,color:"var(--text)",outline:"none",minWidth:180}}
                  />
                  <select
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value)}
                    style={{padding:"6px 10px",fontSize:12,fontFamily:"'Geist Mono',monospace",background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:4,color:"var(--text)",outline:"none",cursor:"pointer"}}
                  >
                    <option value="all">All plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="scale">Scale</option>
                  </select>
                  {(userSearch || planFilter !== "all") && (
                    <button
                      onClick={() => { setUserSearch(""); setPlanFilter("all"); }}
                      style={{padding:"6px 10px",fontSize:11,fontFamily:"'Geist Mono',monospace",background:"transparent",border:"1px solid var(--borderf)",borderRadius:4,color:"var(--sub)",cursor:"pointer"}}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="admin-table-wrap" style={{overflowX:"auto"}}>
                <table className="admin-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12.5,fontFamily:"'Geist Mono',monospace"}}>
                  <thead>
                    <tr style={{background:"rgba(15,23,42,0.02)"}}>
                      <th style={th}>Email</th>
                      <th style={th}>Plan</th>
                      <th style={th}>Signed up</th>
                      <th style={th}>Last sign-in</th>
                      <th style={th}>Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u) => (
                      <tr key={u.id} style={{borderBottom:"1px solid var(--borderf)"}}>
                        <td style={td}><strong>{u.email}</strong></td>
                        <td style={td}><PlanPill plan={u.plan} /></td>
                        <td style={td}>{formatDate(u.signedUpAt)} <span style={{color:"var(--dim)",marginLeft:6}}>· {formatAge(u.signedUpAt)}</span></td>
                        <td style={td}>{u.lastSignInAt ? <>{formatDate(u.lastSignInAt)} <span style={{color:"var(--dim)",marginLeft:6}}>· {formatAge(u.lastSignInAt)}</span></> : <span style={{color:"var(--dim)"}}>—</span>}</td>
                        <td style={td}>{u.confirmed ? <span style={{color:"var(--green)"}}>✓</span> : <span style={{color:"var(--amber)"}}>pending</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div style={{
      background:"var(--card)",border:"1px solid var(--borderf)",
      borderRadius:6,padding:"14px 16px",borderLeft:`2px solid ${accent}`,
    }}>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,letterSpacing:"1.2px",color:"var(--sub)",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:24,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px",lineHeight:1}}>{value}</div>
    </div>
  );
}

function PlanBars({ plans }) {
  const total = Math.max(1, plans.total);
  const seg = [
    { label: "Free",  pct: plans.free  / total, color: "var(--sub)"  },
    { label: "Pro",   pct: plans.pro   / total, color: "var(--blue)" },
    { label: "Scale", pct: plans.scale / total, color: "var(--gold)" },
  ];
  return (
    <div style={{display:"flex",height:18,borderRadius:4,overflow:"hidden",border:"1px solid var(--borderf)"}}>
      {seg.map((s) => (
        s.pct > 0 ? (
          <div key={s.label}
            title={`${s.label}: ${(s.pct*100).toFixed(1)}%`}
            style={{flex:s.pct,background:s.color,minWidth:2}}
          />
        ) : null
      ))}
    </div>
  );
}

function PlanPill({ plan }) {
  const map = {
    free:  { bg:"rgba(100,116,139,0.1)", color:"var(--sub)",  label:"FREE" },
    pro:   { bg:"rgba(0,102,204,0.1)",   color:"var(--blue)", label:"PRO" },
    scale: { bg:"rgba(212,175,55,0.12)", color:"var(--gold)", label:"SCALE" },
  };
  const s = map[plan] || map.free;
  return (
    <span style={{
      display:"inline-block",background:s.bg,color:s.color,
      fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,
      letterSpacing:"0.8px",padding:"3px 7px",borderRadius:3,
      border:`1px solid ${s.color}`,
    }}>{s.label}</span>
  );
}

const th = { textAlign:"left", padding:"10px 14px", fontWeight:700, fontSize:10, letterSpacing:"1.2px", color:"var(--sub)", textTransform:"uppercase", borderBottom:"1px solid var(--borderf)" };
const td = { padding:"10px 14px", color:"var(--text)" };

// 14-day signup sparkline. SVG bars sized by max value so a single big
// spike doesn't flatten the rest of the series.
function Sparkline({ values = [] }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 32;
  const barW = w / values.length;
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:0,height:h+8}}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:"100%",height:h,overflow:"visible"}}>
        {values.map((v, i) => {
          const barH = (v / max) * h;
          const x = i * barW;
          const y = h - barH;
          return (
            <g key={i}>
              <rect
                x={x + 0.5}
                y={y}
                width={Math.max(0.5, barW - 1)}
                height={Math.max(barH, 0.5)}
                fill={v > 0 ? "var(--gold)" : "var(--borderf)"}
                rx={0.5}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChurnCard({ title, count, subtitle, list = [], metaFmt, accent }) {
  return (
    <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderLeft:`2px solid ${accent}`,borderRadius:8,padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase"}}>{title}</div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:18,fontWeight:800,color:accent,letterSpacing:"-0.5px"}}>{count}</div>
      </div>
      <div style={{fontSize:11,color:"var(--dim)",marginBottom:10}}>{subtitle}</div>
      {list.length === 0 ? (
        <div style={{fontSize:11,color:"var(--dim)",fontStyle:"italic"}}>(empty — nice signal)</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {list.map((u) => (
            <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 8px",background:"rgba(0,0,0,0.02)",borderRadius:4,fontFamily:"'Geist Mono',monospace",fontSize:11}}>
              <span style={{color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{u.email}</span>
              <span style={{color:"var(--dim)",fontSize:10,flexShrink:0}}>{metaFmt(u)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
