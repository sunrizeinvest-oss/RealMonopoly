import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * ApiKeys — /settings/api-keys.
 *
 * Scale-tier users manage their API keys here. Raw keys are shown ONCE at
 * creation and never again — only the prefix persists. Users can generate,
 * name, and revoke keys. Non-Scale users see an upgrade CTA.
 */
export default function ApiKeys() {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();

  useDocMeta({
    title: "API Keys · RizeAI",
    description: "Manage your RizeAI API keys — generate, name, and revoke programmatic access to the four-strategy verdict engine.",
  });

  const [keys, setKeys] = useState([]);
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState(null);   // { key, name, prefix } after creation
  const [copiedFresh, setCopiedFresh] = useState(false);

  // Not signed in? bounce to login
  useEffect(() => {
    if (user === null) return; // still resolving
    if (user === false || user === undefined) navigate("/login?next=/settings/api-keys");
  }, [user, navigate]);

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/v1/keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || "Load failed");
      setKeys(data.keys || []);
      setTier(data.tier || "free");
    } catch (e) {
      setError(e?.message || "Couldn't load keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadKeys(); }, [user]);

  const createKey = async () => {
    if (!newKeyName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/v1/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data?.error?.message || "Create failed");
        return;
      }
      setFreshKey({ key: data.key, name: data.record.name, prefix: data.record.key_prefix });
      setNewKeyName("");
      loadKeys();
    } catch (e) {
      setError(e?.message || "Couldn't create key.");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id) => {
    if (!confirm("Revoke this key? Any script using it will start returning 401 immediately. This can't be undone.")) return;
    try {
      const token = await getAccessToken();
      const r = await fetch(`/api/v1/keys?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || "Revoke failed");
      loadKeys();
    } catch (e) {
      setError(e?.message || "Couldn't revoke key.");
    }
  };

  const copyFreshKey = async () => {
    if (!freshKey?.key) return;
    try {
      await navigator.clipboard.writeText(freshKey.key);
      setCopiedFresh(true);
      setTimeout(() => setCopiedFresh(false), 3000);
    } catch {}
  };

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  return (
    <div className="ak-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="ak-body">
        <div className="ak-header">
          <div>
            <div className="ak-eyebrow">
              <span className="ak-eyebrow-dot" />
              SCALE TIER · API KEYS
            </div>
            <h1 className="ak-h1">Your API keys.</h1>
            <p className="ak-sub">Generate programmatic access to <code>/api/v1/verdict</code>. Keys are shown once at creation — copy them immediately.</p>
          </div>
          <button className="ak-btn-ghost" onClick={() => navigate("/api-docs")}>
            📖 API Docs →
          </button>
        </div>

        {tier !== "scale" && tier !== "enterprise" && (
          <div className="ak-upgrade">
            <div className="ak-upgrade-tag">▸ SCALE-TIER FEATURE</div>
            <div className="ak-upgrade-h">Programmatic access is a Scale-tier feature.</div>
            <div className="ak-upgrade-p">Your current tier: <b>{tier}</b>. Scale ($299/mo CAD) unlocks 5,000 API calls per month against the same four-strategy verdict engine that powers /property. Perfect for integrating RizeAI into your CRM, brokerage tool, or investor portal.</div>
            <button className="ak-btn-primary" onClick={() => navigate("/pricing")}>See Scale pricing →</button>
          </div>
        )}

        {(tier === "scale" || tier === "enterprise") && (
          <>
            {/* Freshly created key — shown once */}
            {freshKey && (
              <div className="ak-fresh">
                <div className="ak-fresh-tag">▸ NEW KEY · COPY NOW</div>
                <div className="ak-fresh-name">{freshKey.name}</div>
                <div className="ak-fresh-key-wrap">
                  <code className="ak-fresh-key">{freshKey.key}</code>
                  <button className="ak-fresh-copy" onClick={copyFreshKey}>
                    {copiedFresh ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <div className="ak-fresh-warning">
                  ⚠ This is the only time you'll see the full key. Only the prefix <code>{freshKey.prefix}</code> will remain visible after you close this. Store it in your secrets manager NOW.
                </div>
                <button className="ak-btn-ghost" onClick={() => { setFreshKey(null); setCopiedFresh(false); }}>
                  I've saved it — close
                </button>
              </div>
            )}

            {/* New key form */}
            <div className="ak-section">
              <div className="ak-section-title">▸ Generate new key</div>
              <div className="ak-create-row">
                <input
                  className="ak-input"
                  placeholder="e.g. 'Production Server' or 'Analyst CRM Integration'"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  maxLength={60}
                  disabled={creating}
                  onKeyDown={e => { if (e.key === "Enter") createKey(); }}
                />
                <button
                  className="ak-btn-primary"
                  onClick={createKey}
                  disabled={creating || !newKeyName.trim()}
                >
                  {creating ? "Generating…" : "＋ Generate key"}
                </button>
              </div>
            </div>

            {error && <div className="ak-error">⚠ {error}</div>}

            {/* Active keys */}
            <div className="ak-section">
              <div className="ak-section-title">▸ Active keys · {activeKeys.length}</div>
              {loading ? (
                <div className="ak-loading">Loading keys…</div>
              ) : activeKeys.length === 0 ? (
                <div className="ak-empty">
                  No active keys yet. Generate one above to start hitting <code>/api/v1/verdict</code>.
                </div>
              ) : (
                <div className="ak-keys-list">
                  {activeKeys.map(k => (
                    <div key={k.id} className="ak-key-row">
                      <div className="ak-key-main">
                        <div className="ak-key-name">{k.name}</div>
                        <div className="ak-key-meta">
                          <code>{k.key_prefix}…</code>
                          <span>·</span>
                          <span>Created {new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          {k.last_used_at && (
                            <>
                              <span>·</span>
                              <span>Last used {new Date(k.last_used_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button className="ak-btn-danger" onClick={() => revokeKey(k.id)}>Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revoked keys (collapsed) */}
            {revokedKeys.length > 0 && (
              <div className="ak-section">
                <div className="ak-section-title">▸ Revoked · {revokedKeys.length}</div>
                <div className="ak-keys-list">
                  {revokedKeys.map(k => (
                    <div key={k.id} className="ak-key-row revoked">
                      <div className="ak-key-main">
                        <div className="ak-key-name">{k.name}</div>
                        <div className="ak-key-meta">
                          <code>{k.key_prefix}…</code>
                          <span>·</span>
                          <span style={{ color: "var(--red)" }}>Revoked {new Date(k.revoked_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
  .ak-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ak-body { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }

  .ak-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .ak-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; }
  .ak-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ak-h1 { font-size: clamp(24px, 3.5vw, 34px); font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1.15; margin: 0 0 8px; }
  .ak-sub { font-size: 14px; color: var(--sub); line-height: 1.55; margin: 0; }
  .ak-sub code { font-family: 'Geist Mono', monospace; font-size: 12.5px; background: rgba(15,23,42,0.05); padding: 2px 6px; border-radius: 3px; color: var(--brass-2); }

  .ak-section { margin-bottom: 32px; }
  .ak-section-title { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--borderf); }

  .ak-btn-primary { padding: 10px 18px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }
  .ak-btn-primary:hover:not(:disabled) { background: var(--brass-2); }
  .ak-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .ak-btn-ghost { padding: 8px 14px; border-radius: 5px; background: transparent; color: var(--sub); border: 1px solid var(--borderf); font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .ak-btn-ghost:hover { color: var(--text); border-color: var(--sub); }
  .ak-btn-danger { padding: 6px 12px; border-radius: 5px; background: transparent; color: var(--red); border: 1px solid var(--red); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .ak-btn-danger:hover { background: var(--red); color: #fff; }

  .ak-upgrade { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.05)); border: 1px solid rgba(212,175,55,0.28); border-left: 4px solid var(--brass); border-radius: 12px; }
  .ak-upgrade-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 1.4px; margin-bottom: 12px; }
  .ak-upgrade-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 10px; }
  .ak-upgrade-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; }
  .ak-upgrade-p b { color: var(--text); }

  .ak-fresh { padding: 22px 24px; background: rgba(52,217,138,0.05); border: 1px solid rgba(52,217,138,0.28); border-left: 4px solid var(--green); border-radius: 10px; margin-bottom: 24px; }
  .ak-fresh-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--green); letter-spacing: 1.2px; margin-bottom: 8px; }
  .ak-fresh-name { font-size: 16px; font-weight: 800; color: var(--text); margin-bottom: 12px; }
  .ak-fresh-key-wrap { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
  .ak-fresh-key { flex: 1; font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 700; background: #fff; border: 1px solid var(--borderf); border-radius: 6px; padding: 10px 12px; color: var(--text); word-break: break-all; }
  .ak-fresh-copy { padding: 8px 14px; border-radius: 5px; background: var(--green); color: #fff; border: 1px solid var(--green); font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; letter-spacing: 0.4px; cursor: pointer; white-space: nowrap; }
  .ak-fresh-warning { font-size: 12.5px; color: var(--sub); line-height: 1.5; padding: 10px 12px; background: rgba(234,179,8,0.08); border-left: 3px solid #eab308; border-radius: 4px; margin-bottom: 12px; }
  .ak-fresh-warning code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.05); padding: 1px 5px; border-radius: 3px; color: var(--brass-2); }

  .ak-create-row { display: flex; gap: 8px; align-items: center; }
  .ak-input { flex: 1; padding: 10px 12px; border-radius: 6px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); color: var(--text); font-family: inherit; font-size: 14px; outline: none; transition: border-color 120ms; }
  .ak-input:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }

  .ak-error { padding: 10px 14px; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.20); border-left: 3px solid var(--red); border-radius: 6px; font-size: 13px; color: var(--text); margin-bottom: 20px; }

  .ak-loading, .ak-empty { padding: 32px 20px; text-align: center; color: var(--sub); font-size: 14px; background: var(--card); border: 1px dashed var(--borderf); border-radius: 8px; }
  .ak-empty code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 2px 6px; border-radius: 3px; color: var(--brass-2); }

  .ak-keys-list { display: flex; flex-direction: column; gap: 8px; }
  .ak-key-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .ak-key-row.revoked { opacity: 0.55; }
  .ak-key-name { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .ak-key-meta { display: flex; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); flex-wrap: wrap; }
  .ak-key-meta code { color: var(--brass-2); background: rgba(212,175,55,0.06); padding: 1px 5px; border-radius: 3px; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
