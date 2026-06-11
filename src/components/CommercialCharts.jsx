/**
 * Commercial Analyzer Visual Analytics — extracted for lazy load.
 */
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine,
} from "recharts";

const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtX = n => (isNaN(n) || !isFinite(n) || Math.abs(n) > 999) ? "—" : `${n.toFixed(2)}x`;

export default function CommercialCharts({ c, holdYears }) {
  if (!c) return null;
  return (
    <div className="mf-card" style={{borderRadius:6,borderColor:"rgba(240,160,48,0.18)"}}>
      <div className="mf-card-head" style={{padding:"10px 16px",background:"rgba(240,160,48,0.04)",gap:10}}>
        <div style={{width:30,height:22,border:"1px solid rgba(240,160,48,0.4)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist Mono',monospace",fontSize:9.5,fontWeight:700,color:"#f0a030",letterSpacing:"0.5px"}}>VIZ</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"#f0a030",fontWeight:700,letterSpacing:"0.5px"}}>[ ANALYTICS ]</span>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--dim)"}}>· {holdYears}YR</span>
          </div>
          <div style={{fontSize:12.5,marginTop:1,fontWeight:700,color:"var(--text)",letterSpacing:"0.2px"}}>Trajectory · DSCR · Equity Curve</div>
        </div>
      </div>

      <div style={{padding:"12px 16px 12px"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Geist Mono',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <span>▸ NOI &amp; BTCF / YEAR</span>
          <span>$ CAD</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={c.proj} margin={{top:8,right:16,left:8,bottom:8}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)"/>
            <XAxis dataKey="yr" stroke="#475569" tickFormatter={(v)=>`Y${v}`}/>
            <YAxis stroke="#475569" tickFormatter={(v)=>v>=1000?`$${Math.round(v/1000)}k`:`$${v}`}/>
            <Tooltip contentStyle={{background:"#f8fafc",border:"1px solid rgba(15,23,42,0.07)",borderRadius: 6}}
              labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmt(v)}/>
            <Legend wrapperStyle={{fontSize:11,color:"#475569"}}/>
            <Bar dataKey="noiYr"  name="NOI"  fill="#3b9eff" radius={[4,4,0,0]}/>
            <Bar dataKey="btcfYr" name="BTCF" fill="#34d98a" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{padding:"0 16px 12px"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Geist Mono',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <span>▸ DSCR · LENDER MIN 1.25x</span>
          <span>× MULT</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={c.proj} margin={{top:8,right:16,left:8,bottom:8}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)"/>
            <XAxis dataKey="yr" stroke="#475569" tickFormatter={(v)=>`Y${v}`}/>
            <YAxis stroke="#475569" tickFormatter={(v)=>v.toFixed(2)+"x"} domain={[0.8, "auto"]}/>
            <Tooltip contentStyle={{background:"#f8fafc",border:"1px solid rgba(15,23,42,0.07)",borderRadius: 6}}
              labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmtX(v)}/>
            <ReferenceLine y={1.25} stroke="#f0a030" strokeDasharray="4 4" label={{value:"Lender min 1.25x", fill:"#f0a030", fontSize:10, position:"insideTopLeft"}}/>
            <ReferenceLine y={1.0}  stroke="#f25c5c" strokeDasharray="4 4" label={{value:"Breakeven 1.0x",   fill:"#f25c5c", fontSize:10, position:"insideTopLeft"}}/>
            <Line type="monotone" dataKey="dscrYr" name="DSCR" stroke="#f0a030" strokeWidth={2.5} dot={{r:4,fill:"#f0a030"}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{padding:"0 16px 14px"}}>
        <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Geist Mono',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <span>▸ CUM. INVESTOR POSITION · CROSSES 0 = RECOUPED</span>
          <span>$ CAD</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={c.equityCurve} margin={{top:8,right:16,left:8,bottom:8}}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#34d98a" stopOpacity={0.55}/>
                <stop offset="100%" stopColor="#34d98a" stopOpacity={0.04}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)"/>
            <XAxis dataKey="yr" stroke="#475569" tickFormatter={(v)=>`Y${v}`}/>
            <YAxis stroke="#475569" tickFormatter={(v)=>v>=1000||v<=-1000?`$${Math.round(v/1000)}k`:`$${v}`}/>
            <Tooltip contentStyle={{background:"#f8fafc",border:"1px solid rgba(15,23,42,0.07)",borderRadius: 6}}
              labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmt(v)}/>
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2"/>
            <Area type="monotone" dataKey="cum" name="Cumulative position" stroke="#34d98a" strokeWidth={2} fill="url(#eqGrad)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
