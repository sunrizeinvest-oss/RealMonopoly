/**
 * BRRRR Visual Analytics card — extracted so recharts is lazy-loaded.
 *
 * Parent uses:
 *   const BRRRRCharts = lazy(() => import("./components/BRRRRCharts"));
 *   <Suspense fallback={<ChartsLoading/>}><BRRRRCharts calc={calc}/></Suspense>
 *
 * That way recharts (~200KB gzipped) only downloads when the calc verdict
 * renders — main bundle stays lean.
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

export default function BRRRRCharts({ calc }) {
  if (!calc) return null;
  return (
    <div className="br-card" style={{borderRadius:6,borderColor:"rgba(240,160,48,0.18)"}}>
      <div className="br-card-header" style={{padding:"10px 14px",background:"rgba(240,160,48,0.04)"}}>
        <div style={{width:30,height:22,border:"1px solid rgba(240,160,48,0.4)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Fira Code',monospace",fontSize:9.5,fontWeight:700,color:"var(--amber)",letterSpacing:"0.5px"}}>VIZ</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"var(--amber)",fontWeight:700,letterSpacing:"0.5px"}}>[ ANALYTICS ]</span>
            <span style={{fontFamily:"'Fira Code',monospace",fontSize:10,color:"var(--dim)"}}>· {calc.hold}YR</span>
          </div>
          <div className="br-card-title" style={{fontSize:12.5,marginTop:1,letterSpacing:"0.2px"}}>Trajectory · DSCR · Equity Curve</div>
        </div>
      </div>
      <div className="br-card-body" style={{padding:"12px 14px",gap:14}}>
        <div>
          <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Fira Code',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>▸ NOI &amp; BTCF / YEAR</span>
            <span>$ CAD</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={calc.proj} margin={{top:8,right:16,left:8,bottom:8}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="yr" stroke="#6b7d96" tickFormatter={(v)=>`Y${v}`}/>
              <YAxis stroke="#6b7d96" tickFormatter={(v)=>v>=1000?`$${Math.round(v/1000)}k`:`$${v}`}/>
              <Tooltip contentStyle={{background:"#0d1119",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8}} labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmt(v)}/>
              <Legend wrapperStyle={{fontSize:11,color:"#6b7d96"}}/>
              <Bar dataKey="noiYr"  name="NOI"  fill="#3b9eff" radius={[4,4,0,0]}/>
              <Bar dataKey="btcfYr" name="BTCF" fill="#34d98a" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Fira Code',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>▸ DSCR · LENDER MIN 1.25x</span>
            <span>× MULT</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={calc.proj} margin={{top:8,right:16,left:8,bottom:8}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="yr" stroke="#6b7d96" tickFormatter={(v)=>`Y${v}`}/>
              <YAxis stroke="#6b7d96" tickFormatter={(v)=>v.toFixed(2)+"x"} domain={[0.8,"auto"]}/>
              <Tooltip contentStyle={{background:"#0d1119",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8}} labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmtX(v)}/>
              <ReferenceLine y={1.25} stroke="#f0a030" strokeDasharray="4 4" label={{value:"Lender min 1.25x", fill:"#f0a030", fontSize:10, position:"insideTopLeft"}}/>
              <ReferenceLine y={1.0}  stroke="#f25c5c" strokeDasharray="4 4" label={{value:"Breakeven 1.0x",   fill:"#f25c5c", fontSize:10, position:"insideTopLeft"}}/>
              <Line type="monotone" dataKey="dscrYr" name="DSCR" stroke="#f0a030" strokeWidth={2.5} dot={{r:4,fill:"#f0a030"}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{fontSize:9.5,fontWeight:700,color:"var(--dim)",fontFamily:"'Fira Code',monospace",letterSpacing:"0.6px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
            <span>▸ CUM. INVESTOR POSITION · CROSSES 0 = RECOUPED</span>
            <span>$ CAD</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={calc.equityCurve} margin={{top:8,right:16,left:8,bottom:8}}>
              <defs>
                <linearGradient id="brrrrEqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#34d98a" stopOpacity={0.55}/>
                  <stop offset="100%" stopColor="#34d98a" stopOpacity={0.04}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="yr" stroke="#6b7d96" tickFormatter={(v)=>`Y${v}`}/>
              <YAxis stroke="#6b7d96" tickFormatter={(v)=>(v>=1000||v<=-1000)?`$${Math.round(v/1000)}k`:`$${v}`}/>
              <Tooltip contentStyle={{background:"#0d1119",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8}} labelFormatter={(v)=>`Year ${v}`} formatter={(v)=>fmt(v)}/>
              <ReferenceLine y={0} stroke="#6b7d96" strokeDasharray="2 2"/>
              <Area type="monotone" dataKey="cum" name="Cumulative position" stroke="#34d98a" strokeWidth={2} fill="url(#brrrrEqGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
