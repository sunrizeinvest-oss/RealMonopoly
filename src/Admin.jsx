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

  const sortedUsers = useMemo(() => data?.recentUsers || [], [data]);

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
            </div>

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

            {/* Recent users */}
            <div style={{background:"var(--card)",border:"1px solid var(--borderf)",borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",background:"var(--card2)",borderBottom:"1px solid var(--borderf)",fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--sub)",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>Recent users (newest 50)</span>
                <span style={{color:"var(--dim)"}}>{sortedUsers.length} shown</span>
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
