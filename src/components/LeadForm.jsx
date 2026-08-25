/**
 * LeadForm — email capture form that writes to Supabase `leads` table.
 *
 * Anonymous-friendly (no auth required). Auto-captures referrer + UTM
 * params on submit so we know which channel the lead came from.
 *
 * Props:
 *   source       — string label for the leads table (e.g. 'design-partner')
 *   intent       — optional pre-filled intent ('broker' | 'investor' | ...)
 *   showIntent   — when true, renders the intent picker dropdown
 *   successTitle — banner shown after successful submit
 *   successBody  — sub-text under the success banner
 *   palette      — 'brass' (default) or 'royal' — controls accent colors
 *
 * Renders an email + optional name + optional intent + optional message
 * → submit → green success state with a checkmark.
 *
 * Requires supabase/migrations/007_leads.sql. Without the table, submits
 * fail-soft with a friendly error.
 */

import { useState } from "react";
import { supabase } from "../supabase";

function getUtm(name) {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch { return null; }
}

const PALETTES = {
  brass: {
    accent:        "#d4af37",
    accentText:    "#0a1128",
    accentHover:   "#e6c252",
    border:        "rgba(212,175,55,0.32)",
    bg:            "rgba(212,175,55,0.06)",
    success:       "#22c55e",
    successBg:     "rgba(34,197,94,0.08)",
    successBorder: "rgba(34,197,94,0.32)",
    successText:   "#16a34a",
    label:         "#d4af37",
  },
  royal: {
    accent:        "#2155cd",
    accentText:    "#ffffff",
    accentHover:   "#3265dd",
    border:        "rgba(33,85,205,0.32)",
    bg:            "rgba(33,85,205,0.06)",
    success:       "#22c55e",
    successBg:     "rgba(34,197,94,0.08)",
    successBorder: "rgba(34,197,94,0.32)",
    successText:   "#16a34a",
    label:         "#5b8eff",
  },
};

const INTENT_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "broker",     label: "Commercial broker / agent" },
  { value: "syndicator", label: "Multifamily syndicator / GP" },
  { value: "investor",   label: "Individual investor / homeowner" },
  { value: "brrrr",      label: "BRRRR / fix-and-flip operator" },
  { value: "lender",     label: "Lender / mortgage broker" },
  { value: "other",      label: "Something else" },
];

export default function LeadForm({
  source = "landing",
  intent: intentDefault = "",
  showIntent = false,
  showMessage = false,
  showName = true,
  successTitle = "You're on the list.",
  successBody = "We'll be in touch within one business day.",
  submitLabel = "▸ Apply",
  palette = "brass",
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [intent, setIntent] = useState(intentDefault);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'submitting' | 'success' | 'error'
  const [error, setError] = useState("");

  const p = PALETTES[palette] || PALETTES.brass;

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "submitting") return;
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const referrer = typeof document !== "undefined" ? document.referrer : "";
      const payload = {
        email:        trimmed,
        name:         name.trim() || null,
        intent:       intent || null,
        source,
        message:      message.trim() || null,
        referrer:     referrer || null,
        utm_source:   getUtm("utm_source"),
        utm_medium:   getUtm("utm_medium"),
        utm_campaign: getUtm("utm_campaign"),
      };
      const { error: insertErr } = await supabase.from("leads").insert(payload);
      if (insertErr) throw insertErr;
      setStatus("success");
    } catch (err) {
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(/relation.*does not exist/i.test(msg)
        ? "Lead capture isn't fully wired yet — email hello@rizeai.io instead."
        : msg);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{
        padding: "20px 22px",
        background: p.successBg,
        border: `1px solid ${p.successBorder}`,
        borderLeft: `3px solid ${p.success}`,
        borderRadius: 6,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{
            width:20,height:20,borderRadius:"50%",background:p.success,
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            color:"#fff",fontSize:13,fontWeight:800,
          }}>✓</span>
          <div style={{fontSize:14.5,fontWeight:800,color:p.successText,letterSpacing:"-0.2px"}}>
            {successTitle}
          </div>
        </div>
        <div style={{fontSize:13,color:"#d4d8e0",lineHeight:1.55}}>
          {successBody}
        </div>
      </div>
    );
  }

  const fieldStyle = {
    width:"100%",
    background:"rgba(0,0,0,0.25)",
    color:"#f0f0f0",
    border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:4,
    padding:"10px 12px",
    fontFamily:"'Geist',sans-serif",
    fontSize:13.5,
    outline:"none",
    transition:"border-color 0.15s",
  };
  const labelStyle = {
    display:"block",
    fontFamily:"'Geist Mono',ui-monospace,monospace",
    fontSize:10,fontWeight:700,letterSpacing:"1.2px",
    color:p.label,textTransform:"uppercase",
    marginBottom:5,
  };

  return (
    <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:10}}>
      {showName && (
        <div>
          <label style={labelStyle}>Name (optional)</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={fieldStyle}
            onFocus={e => e.currentTarget.style.borderColor = p.accent}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            disabled={status === "submitting"}
          />
        </div>
      )}
      <div>
        <label style={labelStyle}>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={fieldStyle}
          onFocus={e => e.currentTarget.style.borderColor = p.accent}
          onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          disabled={status === "submitting"}
        />
      </div>
      {showIntent && (
        <div>
          <label style={labelStyle}>I am…</label>
          <select
            value={intent}
            onChange={e => setIntent(e.target.value)}
            style={fieldStyle}
            onFocus={e => e.currentTarget.style.borderColor = p.accent}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            disabled={status === "submitting"}
          >
            {INTENT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} style={{background:"#0a1128",color:"#f0f0f0"}}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {showMessage && (
        <div>
          <label style={labelStyle}>One thing about your deal flow (optional)</label>
          <textarea
            placeholder="e.g. I underwrite ~3 multifamily deals/month in Calgary"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            style={{...fieldStyle,resize:"vertical",minHeight:54}}
            onFocus={e => e.currentTarget.style.borderColor = p.accent}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            disabled={status === "submitting"}
          />
        </div>
      )}
      {error && (
        <div style={{
          padding:"7px 11px",fontSize:12,
          color:"#dc2626",
          background:"rgba(220,38,38,0.08)",
          border:"1px solid rgba(220,38,38,0.28)",
          borderRadius:4,
        }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        style={{
          background: p.accent,
          color: p.accentText,
          border:"none",
          borderRadius:4,
          padding:"12px 18px",
          fontFamily:"'Geist Mono',ui-monospace,monospace",
          fontSize:11.5,
          fontWeight:800,
          letterSpacing:"0.6px",
          cursor: status === "submitting" ? "wait" : "pointer",
          textTransform:"uppercase",
          opacity: status === "submitting" ? 0.65 : 1,
          transition:"all 0.15s",
        }}
        onMouseOver={e => { if (status !== "submitting") e.currentTarget.style.background = p.accentHover; }}
        onMouseOut={e => e.currentTarget.style.background = p.accent}
      >
        {status === "submitting" ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}
