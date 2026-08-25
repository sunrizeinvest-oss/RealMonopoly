import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useDocMeta } from "./lib/seo";
import { useFreeTier } from "./lib/freeTier";
import { supabase } from "./supabase";
import TopNav from "./components/TopNav";

/**
 * Branding — /settings/branding. Scale-tier users configure their firm
 * identity here. Logo, name, tagline, contact info. Every generated PDF
 * (verdict memo, IC memo, investor summary, lender package) reads this
 * table and swaps the header. Non-Scale users see an upgrade CTA.
 *
 * Logo storage: Supabase Storage `firm-logos` bucket, per-user folder.
 * ~512KB max, jpeg/png/svg accepted. URL is stored in user_branding.
 */
export default function Branding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const freeTier = useFreeTier();
  const fileRef = useRef(null);

  useDocMeta({
    title: "Firm Branding · RizeAI",
    description: "Set your firm's white-label branding for RizeAI-generated PDFs. Scale-tier feature.",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [firmName, setFirmName] = useState("");
  const [firmTagline, setFirmTagline] = useState("");
  const [firmEmail, setFirmEmail] = useState("");
  const [firmPhone, setFirmPhone] = useState("");
  const [firmWebsite, setFirmWebsite] = useState("");
  const [firmLogoUrl, setFirmLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#d4af37");

  const canEdit = freeTier.tier === "scale" || freeTier.tier === "enterprise";

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("user_branding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setFirmName(data.firm_name || "");
          setFirmTagline(data.firm_tagline || "");
          setFirmEmail(data.firm_email || "");
          setFirmPhone(data.firm_phone || "");
          setFirmWebsite(data.firm_website || "");
          setFirmLogoUrl(data.firm_logo_url || "");
          setPrimaryColor(data.primary_color || "#d4af37");
        }
      } catch (e) {
        console.warn("branding load failed:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user || !canEdit) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const payload = {
        user_id:      user.id,
        firm_name:    firmName.trim() || null,
        firm_tagline: firmTagline.trim() || null,
        firm_email:   firmEmail.trim() || null,
        firm_phone:   firmPhone.trim() || null,
        firm_website: firmWebsite.trim() || null,
        firm_logo_url: firmLogoUrl || null,
        primary_color: primaryColor,
      };
      const { error: e } = await supabase.from("user_branding").upsert(payload);
      if (e) throw e;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3200);
    } catch (e) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!user || !file) return;
    if (file.size > 512_000) {
      setError("Logo must be under 512 KB. Compress or resize before upload.");
      return;
    }
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/i.test(file.type)) {
      setError("Logo must be PNG, JPG, SVG, or WebP.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("firm-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: publicUrl } = supabase.storage.from("firm-logos").getPublicUrl(path);
      setFirmLogoUrl(publicUrl.publicUrl + `?v=${Date.now()}`);  // cache-bust
    } catch (e) {
      setError(e?.message || "Upload failed. Make sure the firm-logos bucket exists in Supabase Storage.");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setFirmLogoUrl("");

  if (!user) {
    return (
      <div className="br-wrap">
        <TopNav />
        <div style={{ padding: 60, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--sub)" }}>Sign in to configure firm branding.</p>
          <button className="br-btn-primary" onClick={() => navigate("/login?next=/settings/branding")} style={{ marginTop: 12 }}>Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="br-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="br-body">
        <div className="br-header">
          <div>
            <div className="br-eyebrow">
              <span className="br-eyebrow-dot" />
              SCALE TIER · FIRM BRANDING
            </div>
            <h1 className="br-h1">Your firm on every PDF.</h1>
            <p className="br-sub">Upload a logo, set your firm name + contact info. Every verdict memo, IC memo, and lender package RizeAI generates for you gets your branding instead of ours.</p>
          </div>
          <button className="br-btn-ghost" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>

        {!canEdit && (
          <div className="br-upgrade">
            <div className="br-upgrade-tag">▸ SCALE-TIER FEATURE</div>
            <div className="br-upgrade-h">Your PDFs. Your firm's brand.</div>
            <div className="br-upgrade-p">Current tier: <b>{freeTier.tier}</b>. White-label PDFs are Scale-tier ($299/mo CAD). Perfect for brokers presenting deals to clients under their own firm's brand.</div>
            <button className="br-btn-primary" onClick={() => navigate("/pricing")}>See Scale pricing →</button>
          </div>
        )}

        {canEdit && (
          <>
            {loading ? (
              <div className="br-loading">Loading…</div>
            ) : (
              <>
                {/* Logo upload */}
                <section className="br-section">
                  <div className="br-section-title">▸ Firm logo</div>
                  <div className="br-logo-row">
                    <div className="br-logo-preview">
                      {firmLogoUrl ? (
                        <img src={firmLogoUrl} alt="Firm logo" />
                      ) : (
                        <div className="br-logo-placeholder">No logo uploaded</div>
                      )}
                    </div>
                    <div className="br-logo-actions">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        style={{ display: "none" }}
                        onChange={e => uploadLogo(e.target.files?.[0])}
                      />
                      <button
                        className="br-btn-primary"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading…" : firmLogoUrl ? "Replace logo" : "Upload logo"}
                      </button>
                      {firmLogoUrl && (
                        <button className="br-btn-ghost" onClick={removeLogo}>Remove</button>
                      )}
                      <div className="br-logo-hint">
                        PNG, JPG, SVG, or WebP. Under 512 KB. Landscape works best (e.g. 200×80).
                      </div>
                    </div>
                  </div>
                </section>

                {/* Text fields */}
                <section className="br-section">
                  <div className="br-section-title">▸ Firm identity</div>
                  <div className="br-fields">
                    <Field label="Firm name" value={firmName} onChange={setFirmName} placeholder="Northstar Capital" />
                    <Field label="Tagline" value={firmTagline} onChange={setFirmTagline} placeholder="Institutional real estate advisory" />
                  </div>
                  <div className="br-fields">
                    <Field label="Email" value={firmEmail} onChange={setFirmEmail} placeholder="deals@northstarcapital.com" />
                    <Field label="Phone" value={firmPhone} onChange={setFirmPhone} placeholder="+1 (403) 555-0198" />
                  </div>
                  <Field label="Website" value={firmWebsite} onChange={setFirmWebsite} placeholder="northstarcapital.com" full />
                </section>

                {/* Color */}
                <section className="br-section">
                  <div className="br-section-title">▸ Primary accent color</div>
                  <div className="br-color-row">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="br-color-picker"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="br-input"
                      style={{ maxWidth: 140, fontFamily: "'Geist Mono', monospace" }}
                      pattern="^#[0-9a-fA-F]{6}$"
                    />
                    <span className="br-color-note">Used for section headers + accents in PDFs.</span>
                  </div>
                </section>

                {error && <div className="br-error">⚠ {error}</div>}
                {success && <div className="br-success">✓ Branding saved. Next PDF you generate will use it.</div>}

                <div className="br-save-row">
                  <button className="br-btn-primary lg" onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save branding"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, full }) {
  return (
    <div className="br-field" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label className="br-field-label">{label}</label>
      <input
        className="br-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const CSS = `
  .br-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .br-body { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; }

  .br-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
  .br-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; }
  .br-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .br-h1 { font-size: clamp(24px, 3.5vw, 34px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.15; margin: 0 0 8px; }
  .br-sub { font-size: 14px; color: var(--sub); line-height: 1.55; margin: 0; max-width: 620px; }

  .br-btn-primary { padding: 10px 18px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .br-btn-primary.lg { padding: 12px 24px; font-size: 12.5px; }
  .br-btn-primary:hover:not(:disabled) { background: var(--brass-2); }
  .br-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .br-btn-ghost { padding: 8px 14px; border-radius: 5px; background: transparent; color: var(--sub); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .br-btn-ghost:hover { color: var(--text); border-color: var(--sub); }

  .br-upgrade { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-left: 4px solid var(--brass); border-radius: 12px; }
  .br-upgrade-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; margin-bottom: 12px; }
  .br-upgrade-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .br-upgrade-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; }

  .br-loading { padding: 40px 20px; text-align: center; color: var(--sub); }

  .br-section { margin-bottom: 32px; }
  .br-section-title { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--borderf); }

  .br-logo-row { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
  .br-logo-preview { width: 220px; height: 110px; background: #fff; border: 1px solid var(--borderf); border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 12px; overflow: hidden; }
  .br-logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .br-logo-placeholder { font-size: 12px; color: var(--dim); font-style: italic; }
  .br-logo-actions { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 220px; }
  .br-logo-hint { font-size: 12px; color: var(--sub); line-height: 1.5; }

  .br-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  @media (max-width: 640px) { .br-fields { grid-template-columns: 1fr; } }
  .br-field { display: flex; flex-direction: column; gap: 5px; }
  .br-field-label { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; }
  .br-input { padding: 10px 12px; border-radius: 6px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); color: var(--text); font-family: inherit; font-size: 14px; outline: none; transition: border-color 120ms; }
  .br-input:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }

  .br-color-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .br-color-picker { width: 44px; height: 44px; border-radius: 6px; border: 1px solid var(--borderf); cursor: pointer; padding: 2px; }
  .br-color-note { font-size: 12.5px; color: var(--sub); }

  .br-error { padding: 12px 14px; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.20); border-left: 3px solid var(--red); border-radius: 6px; font-size: 13px; color: var(--text); margin-bottom: 12px; }
  .br-success { padding: 12px 14px; background: rgba(52,217,138,0.06); border: 1px solid rgba(52,217,138,0.28); border-left: 3px solid var(--green); border-radius: 6px; font-size: 13px; color: var(--text); margin-bottom: 12px; }

  .br-save-row { display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid var(--borderf); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
