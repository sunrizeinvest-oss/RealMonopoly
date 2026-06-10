import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useNavigate } from "react-router-dom";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#ffffff;overflow-x:hidden}
  body{color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  input{font-size:16px!important;font-family:'Geist',sans-serif}
  .rp-wrap{width:100%;min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
  .rp-wrap::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.03) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .rp-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.08) 0%,transparent 65%);pointer-events:none}
  .rp-card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:40px 36px;width:100%;max-width:420px;position:relative;z-index:1;box-shadow:0 24px 80px rgba(0,0,0,0.5)}
  .rp-brand{text-align:center;margin-bottom:28px}
  .rp-logo{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .rp-logo span{color:var(--blue)}
  .rp-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;text-align:center}
  .rp-sub{font-size:13px;color:var(--sub);margin-bottom:24px;text-align:center;line-height:1.6}
  .rp-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
  .rp-label{font-size:11.5px;font-weight:600;color:var(--sub);letter-spacing:0.3px;display:flex;justify-content:space-between}
  .rp-input{width:100%;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:6px;padding:13px 14px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.15s}
  .rp-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}
  .rp-hint{font-size:11px;color:var(--dim);margin-top:4px}
  .rp-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:6px;padding:14px;font-family:'Geist',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.15s;margin-top:8px}
  .rp-btn:hover{background:#5aaeff;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,158,255,0.35)}
  .rp-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none;box-shadow:none}
  .rp-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius: 6px;padding:10px 14px;font-size:12px;color:var(--red);margin-bottom:12px}
  .rp-success{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:6px;padding:18px;font-size:13px;color:var(--green);text-align:center;line-height:1.6}
  .rp-success-icon{font-size:32px;margin-bottom:10px}
  .rp-invalid{text-align:center;padding:24px 0}
  .rp-invalid-icon{font-size:36px;margin-bottom:12px}
  .rp-invalid-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px}
  .rp-invalid-sub{font-size:13px;color:var(--sub);margin-bottom:20px;line-height:1.6}
  .rp-link{color:var(--blue);cursor:pointer;font-weight:600;font-size:13px}
  @media(max-width:480px){.rp-card{padding:28px 20px;border-radius:6px}}
`;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(null); // null=checking, true=valid, false=invalid

  useEffect(() => {
    // Supabase parses the URL fragment (#access_token=...&type=recovery)
    // and fires an AUTH_TOKEN_REFRESHED / PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });
    // Also check if session already exists (page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      else setValidSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError(""); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate("/analyze"), 2500);
  }

  return (
    <div className="rp-wrap">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />
      <div className="rp-glow" />
      <div className="rp-card">
        <div className="rp-brand">
          <div className="rp-logo"><span>Real</span> Deal</div>
        </div>

        {validSession === null && (
          <div style={{textAlign:"center",padding:"24px 0",color:"var(--sub)",fontSize:14}}>Verifying reset link…</div>
        )}

        {validSession === false && (
          <div className="rp-invalid">
            <div className="rp-invalid-icon">🔗</div>
            <div className="rp-invalid-title">Link expired or invalid</div>
            <div className="rp-invalid-sub">Password reset links expire after 1 hour. Request a new one and try again.</div>
            <span className="rp-link" onClick={() => navigate("/forgot-password")}>Request a new reset link →</span>
          </div>
        )}

        {validSession === true && !done && (
          <>
            <div className="rp-title">Set a new password</div>
            <div className="rp-sub">Choose something strong — at least 8 characters.</div>
            {error && <div className="rp-error">{error}</div>}
            <div className="rp-field">
              <div className="rp-label">New password</div>
              <input
                className="rp-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <div className="rp-hint">Minimum 8 characters</div>
            </div>
            <div className="rp-field">
              <div className="rp-label">Confirm password</div>
              <input
                className="rp-input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()}
              />
            </div>
            <button className="rp-btn" onClick={handleReset} disabled={loading}>
              {loading ? "Updating..." : "Update password →"}
            </button>
          </>
        )}

        {done && (
          <div className="rp-success">
            <div className="rp-success-icon">✅</div>
            <strong>Password updated!</strong><br />
            Taking you to the analyzer…
          </div>
        )}
      </div>
    </div>
  );
}
