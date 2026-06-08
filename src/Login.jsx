import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:var(--bg);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  input{font-size:16px!important;font-family:'DM Sans',sans-serif}

  /* Single-column centered layout — marketing is a slimmer left accent only on very wide screens */
  .lg-wrap{display:grid;grid-template-columns:1fr;min-height:100vh}
  @media(min-width:1100px){.lg-wrap{grid-template-columns:minmax(380px, 0.65fr) minmax(440px, 1fr); max-width:1280px; margin:0 auto}}

  /* ── Left panel ── */
  .lg-left{position:relative;background:var(--card);border-right:1px solid var(--borderf);display:flex;flex-direction:column;justify-content:space-between;padding:48px 56px;overflow:hidden}
  .lg-left::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(52,217,138,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(52,217,138,0.025) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
  .lg-left-glow{position:absolute;bottom:-10%;left:20%;width:500px;height:500px;background:radial-gradient(ellipse,rgba(52,217,138,0.08) 0%,transparent 65%);pointer-events:none}

  .lg-left-top{position:relative;z-index:1}
  .lg-logo{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:56px;display:inline-block}
  .lg-logo span{color:var(--green)}

  .lg-headline{font-size:clamp(28px,3.5vw,42px);font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1.1;margin-bottom:16px}
  .lg-headline span{color:var(--green)}
  .lg-sub{font-size:15px;color:var(--sub);line-height:1.65;max-width:380px;margin-bottom:40px}

  .lg-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:44px}
  .lg-metric-tile{background:rgba(255,255,255,0.03);border:1px solid var(--borderf);border-radius:12px;padding:16px 18px}
  .lg-metric-val{font-size:22px;font-weight:800;color:var(--green);letter-spacing:-0.5px;margin-bottom:3px;font-variant-numeric:tabular-nums}
  .lg-metric-label{font-size:11px;color:var(--sub);font-weight:500}

  .lg-bullets{display:flex;flex-direction:column;gap:12px}
  .lg-bullet{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--sub);line-height:1.4}
  .lg-bullet-icon{width:20px;height:20px;border-radius:50%;background:rgba(52,217,138,0.12);border:1px solid rgba(52,217,138,0.25);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;margin-top:1px}

  .lg-left-bottom{position:relative;z-index:1}
  .lg-testimonial{background:rgba(255,255,255,0.03);border:1px solid var(--borderf);border-radius:12px;padding:18px 20px}
  .lg-testimonial-text{font-size:13px;color:var(--sub);line-height:1.6;margin-bottom:12px;font-style:italic}
  .lg-testimonial-author{font-size:12px;color:var(--dim);font-weight:600}

  /* ── Right panel ── */
  .lg-right{display:flex;align-items:center;justify-content:center;padding:48px 56px;position:relative;background:var(--bg)}
  .lg-right::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.02) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
  .lg-right-glow{position:absolute;top:20%;right:10%;width:400px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.07) 0%,transparent 65%);pointer-events:none;z-index:0}

  .lg-form-wrap{width:100%;max-width:400px;position:relative;z-index:1}
  .lg-form-title{font-size:24px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:6px}
  .lg-form-sub{font-size:14px;color:var(--sub);margin-bottom:28px}

  .lg-tabs{display:flex;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:10px;padding:3px;gap:3px;margin-bottom:22px}
  .lg-tab{flex:1;padding:9px 0;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;text-align:center}
  .lg-tab.active{background:var(--blue);color:#fff;box-shadow:0 2px 8px rgba(59,158,255,0.3)}
  .lg-tab.inactive{background:transparent;color:var(--sub)}

  .lg-google{width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--borderf);border-radius:10px;padding:13px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.15s;margin-bottom:4px}
  .lg-google:hover{background:rgba(255,255,255,0.09);border-color:var(--border)}

  .lg-divider{display:flex;align-items:center;gap:12px;margin:16px 0}
  .lg-divider::before,.lg-divider::after{content:'';flex:1;height:1px;background:var(--borderf)}
  .lg-divider span{font-size:11px;color:var(--dim)}

  .lg-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
  .lg-label{font-size:11.5px;font-weight:600;color:var(--sub);letter-spacing:0.3px;display:flex;justify-content:space-between;align-items:center}
  .lg-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:10px;padding:13px 14px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.15s,box-shadow 0.15s}
  .lg-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}

  .lg-btn{width:100%;background:linear-gradient(135deg,var(--blue),#2980e8);color:#fff;border:none;border-radius:10px;padding:14px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.18s;margin-top:4px;letter-spacing:-0.2px}
  .lg-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,158,255,0.35)}
  .lg-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;box-shadow:none}

  .lg-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--red);margin-bottom:12px}
  .lg-success{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--green);margin-bottom:12px}

  .lg-toggle{text-align:center;margin-top:18px;font-size:13px;color:var(--sub)}
  .lg-toggle span{color:var(--blue);cursor:pointer;font-weight:600}
  .lg-toggle span:hover{text-decoration:underline}

  .lg-footer{text-align:center;margin-top:14px;font-size:12px;color:var(--dim)}
  .lg-footer a{color:var(--dim);text-decoration:none;cursor:pointer;margin:0 6px;transition:color 0.15s}
  .lg-footer a:hover{color:var(--sub)}

  /* Below 1100px → single-column centered form, marketing hidden */
  @media(max-width:1099px){
    .lg-left{display:none}
    .lg-right{padding:48px 32px;min-height:100vh}
    .lg-form-wrap{max-width:440px}
  }
  @media(max-width:480px){
    .lg-right{padding:32px 18px}
  }
`;

export default function Login() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/analyze"); }, [user]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit() {
    if (!form.email || !form.password) { setError("Please enter your email and password."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setSuccess(""); setLoading(true);
    const { error } = mode === "signup"
      ? await signUp(form.email, form.password)
      : await signIn(form.email, form.password);
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (mode === "signup") {
      setSuccess("Account created! Taking you to the analyzer…");
      setTimeout(() => navigate("/analyze"), 1200);
    } else {
      navigate("/analyze");
    }
  }

  async function handleGoogle() {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  return (
    <div className="lg-wrap">
      <style>{CSS}</style>

      {/* ── Left: Branding ── */}
      <div className="lg-left">
        <div className="lg-left-glow" />
        <div className="lg-left-top">
          <div className="lg-logo"><span>Real</span> Deal</div>

          <div className="lg-headline">
            Underwrite any deal<br /><span>in under 60 seconds.</span>
          </div>
          <div className="lg-sub">
            The same institutional analysis that hedge funds and private equity use — cap rate, IRR, DSCR, equity multiple, 5-year pro forma — built for Canadian real estate investors.
          </div>

          <div className="lg-metrics">
            <div className="lg-metric-tile">
              <div className="lg-metric-val">12+</div>
              <div className="lg-metric-label">Metrics per deal</div>
            </div>
            <div className="lg-metric-tile">
              <div className="lg-metric-val">&lt; 60s</div>
              <div className="lg-metric-label">Full analysis time</div>
            </div>
            <div className="lg-metric-tile">
              <div className="lg-metric-val">$0</div>
              <div className="lg-metric-label">To get started</div>
            </div>
            <div className="lg-metric-tile">
              <div className="lg-metric-val">5-yr</div>
              <div className="lg-metric-label">Pro forma included</div>
            </div>
          </div>

          <div className="lg-bullets">
            <div className="lg-bullet">
              <div className="lg-bullet-icon">✓</div>
              <span>Flip analyzer — ARV, rehab costs, profit, deal score</span>
            </div>
            <div className="lg-bullet">
              <div className="lg-bullet-icon">✓</div>
              <span>Multi-family analyzer — IRR, equity multiple, NPV, DSCR, amortization</span>
            </div>
            <div className="lg-bullet">
              <div className="lg-bullet-icon">✓</div>
              <span>Automatic property map from any address</span>
            </div>
            <div className="lg-bullet">
              <div className="lg-bullet-icon">✓</div>
              <span>PDF export of your full underwriting report</span>
            </div>
          </div>
        </div>

        <div className="lg-left-bottom">
          <div className="lg-testimonial">
            <div className="lg-testimonial-text">"Used to spend 2 hours building a spreadsheet for every deal. Now I have a full analysis in a minute and a PDF I can send straight to my lender."</div>
            <div className="lg-testimonial-author">— Real estate investor, Calgary AB</div>
          </div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="lg-right">
        <div className="lg-right-glow" />
        <div className="lg-form-wrap">
          <div className="lg-form-title">
            {mode === "signup" ? "Start for free" : "Welcome back"}
          </div>
          <div className="lg-form-sub">
            {mode === "signup"
              ? "No credit card required. Upgrade to Pro anytime."
              : "Sign in to your Real Deal account."}
          </div>

          <div className="lg-tabs">
            <button className={`lg-tab ${mode==="signup"?"active":"inactive"}`} onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}>Sign up free</button>
            <button className={`lg-tab ${mode==="login"?"active":"inactive"}`} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>Log in</button>
          </div>

          <button className="lg-google" onClick={handleGoogle}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="lg-divider"><span>or continue with email</span></div>

          {error && <div className="lg-error">{error}</div>}
          {success && <div className="lg-success">{success}</div>}

          <div className="lg-field">
            <div className="lg-label">Email</div>
            <input className="lg-input" type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <div className="lg-field">
            <div className="lg-label">
              Password
              {mode === "login" && (
                <span style={{fontSize:11.5,color:"var(--blue)",cursor:"pointer",fontWeight:600}} onClick={() => navigate("/forgot-password")}>
                  Forgot password?
                </span>
              )}
            </div>
            <input className="lg-input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          <button className="lg-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait…" : mode === "signup" ? "Create free account →" : "Sign in →"}
          </button>

          <div className="lg-toggle">
            {mode === "signup"
              ? <>Already have an account? <span onClick={() => { setMode("login"); setError(""); }}>Sign in</span></>
              : <>Don't have an account? <span onClick={() => { setMode("signup"); setError(""); }}>Sign up free</span></>}
          </div>

          <div className="lg-footer">
            <a onClick={() => navigate("/pricing")}>Pricing</a>·
            <a href="/privacy">Privacy</a>·
            <a href="/terms">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
