import { useState } from "react";
import { supabase } from "./supabase";
import { useNavigate } from "react-router-dom";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#ffffff;overflow-x:hidden}
  body{color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  input{font-size:16px!important;font-family:'Geist',sans-serif}
  .fp-wrap{width:100%;min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
  .fp-wrap::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.03) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .fp-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.08) 0%,transparent 65%);pointer-events:none}
  .fp-card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:40px 36px;width:100%;max-width:420px;position:relative;z-index:1;box-shadow:0 24px 80px rgba(0,0,0,0.5)}
  .fp-brand{text-align:center;margin-bottom:28px}
  .fp-logo{font-size:22px;font-weight:800;color:var(--text);margin-bottom:6px;letter-spacing:-0.5px}
  .fp-logo span{color:var(--blue)}
  .fp-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;text-align:center}
  .fp-sub{font-size:13px;color:var(--sub);margin-bottom:24px;text-align:center;line-height:1.6}
  .fp-field{display:flex;flex-direction:column;gap:5px;margin-bottom:16px}
  .fp-label{font-size:11.5px;font-weight:600;color:var(--sub);letter-spacing:0.3px}
  .fp-input{width:100%;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius:6px;padding:13px 14px;font-size:14px;color:var(--text);outline:none;transition:border-color 0.15s}
  .fp-input:focus{border-color:rgba(59,158,255,0.5);box-shadow:0 0 0 3px rgba(59,158,255,0.1)}
  .fp-btn{width:100%;background:var(--blue);color:#fff;border:none;border-radius:6px;padding:14px;font-family:'Geist',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.15s;margin-top:4px}
  .fp-btn:hover{background:#5aaeff;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,158,255,0.35)}
  .fp-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none;box-shadow:none}
  .fp-error{background:rgba(242,92,92,0.08);border:1px solid rgba(242,92,92,0.2);border-radius: 6px;padding:10px 14px;font-size:12px;color:var(--red);margin-bottom:12px}
  .fp-success{background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:6px;padding:18px;font-size:13px;color:var(--green);text-align:center;line-height:1.6}
  .fp-success-icon{font-size:32px;margin-bottom:10px}
  .fp-back{text-align:center;margin-top:20px;font-size:13px;color:var(--sub)}
  .fp-back span{color:var(--blue);cursor:pointer;font-weight:600}
  @media(max-width:480px){.fp-card{padding:28px 20px;border-radius:6px}}
`;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email) { setError("Please enter your email address."); return; }
    setError(""); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div className="fp-wrap">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght;500;600;700;800&family=Geist+Mono:wght;500;600;700&display=swap" rel="stylesheet" />
      <div className="fp-glow" />
      <div className="fp-card">
        <div className="fp-brand">
          <div className="fp-logo"><span>Real</span> Deal</div>
        </div>

        {sent ? (
          <>
            <div className="fp-success">
              <div className="fp-success-icon">📬</div>
              <strong>Check your inbox</strong><br />
              We sent a password reset link to <strong>{email}</strong>. It may take a minute to arrive — check your spam folder if you don't see it.
            </div>
            <div className="fp-back" style={{marginTop:24}}>
              <span onClick={() => navigate("/login")}>← Back to sign in</span>
            </div>
          </>
        ) : (
          <>
            <div className="fp-title">Reset your password</div>
            <div className="fp-sub">Enter the email you signed up with and we'll send you a reset link.</div>
            {error && <div className="fp-error">{error}</div>}
            <div className="fp-field">
              <div className="fp-label">Email</div>
              <input
                className="fp-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
            <button className="fp-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Sending..." : "Send reset link →"}
            </button>
            <div className="fp-back">
              <span onClick={() => navigate("/login")}>← Back to sign in</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
