import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { runAllStrategies } from "../lib/strategyMath.js";
import { useFreeTier } from "../lib/freeTier.js";
import { FreeTierUpgradeModal } from "./FreeTierBanner.jsx";
import {
  trackVerdictCardClick, trackToolClick, trackSaveToDashboard, trackUpgradeModalOpen, track,
} from "../lib/analytics.js";
import { buildVerdictUrl } from "../lib/shareVerdict.js";
import { generateVerdictMemoPDF } from "../lib/verdictMemoPDF.js";

/**
 * StrategyVerdicts — the "one address, four verdicts" panel.
 *
 * Renders 4 strategy cards side-by-side (Buy&Hold, BRRRR, Flip, Multifamily),
 * each with a color-coded verdict pill, a big headline number, 4 supporting
 * metrics, and a CTA to open the full calculator with the property state
 * pre-populated via sessionStorage.
 *
 * The math is a first-pass "does this deal work?" — the linked calculators
 * are where the user tweaks holding period, exit cap, rehab scope, etc.
 */
export default function StrategyVerdicts({ property }) {
  const navigate = useNavigate();
  const freeTier = useFreeTier();
  const [showSaveGate, setShowSaveGate] = useState(false);

  // Inline overrides — when a verdict card can't fire because a field is
  // missing (purchase / rent / sqft / units), the user can type a value into
  // the empty state. Overrides merge with property and get re-run through the
  // strategy math. Only used for THIS panel; doesn't propagate to other
  // /property surfaces or persist.
  const [overrides, setOverrides] = useState({});
  const merged = useMemo(() => {
    const clean = { ...(property || {}) };
    Object.entries(overrides).forEach(([k, v]) => {
      const n = Number(v);
      if (v !== "" && Number.isFinite(n) && n > 0) clean[k] = n;
    });
    return clean;
  }, [property, overrides]);
  const results = useMemo(() => runAllStrategies(merged), [merged]);

  // Save state — was a boolean, now null | "success" | "error" so we can
  // show a distinct toast for each and auto-dismiss.
  const [saveState, setSaveState] = useState(null);
  useEffect(() => {
    if (!saveState) return;
    const t = setTimeout(() => setSaveState(null), 4000);
    return () => clearTimeout(t);
  }, [saveState]);
  const saved = saveState === "success";

  // Copy-to-clipboard state for the "Share this verdict" button. Same
  // auto-dismiss pattern as saveState.
  const [shareState, setShareState] = useState(null); // null | "copied" | "error"
  useEffect(() => {
    if (!shareState) return;
    const t = setTimeout(() => setShareState(null), 3200);
    return () => clearTimeout(t);
  }, [shareState]);

  const shareVerdict = async () => {
    if (!merged?.address) return;
    try {
      const url = buildVerdictUrl(merged);
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      track("verdict_share_click", { city: merged.city || "" });
    } catch {
      setShareState("error");
    }
  };

  // Memo generation state — Pro-gated. Fires our AI, then jsPDF.
  const [memoState, setMemoState] = useState(null); // null | "loading" | "error" | "ready"

  const generateMemo = async () => {
    if (!merged?.address || memoState === "loading") return;
    if (!freeTier.canExportPDF) {
      trackUpgradeModalOpen("pdf");
      setShowSaveGate(true);  // reuse the same gate modal, will show `pdf` reason if we pass it
      return;
    }
    setMemoState("loading");
    track("verdict_memo_click", { city: merged.city || "" });
    try {
      const r = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "verdict-memo",
          property: merged,
          strategyResults: results.map(r => ({
            key: r.key, name: r.name, viable: r.viable,
            verdict: r.verdict,
            headline: r.headline, subhead: r.subhead,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "memo generation failed");
      await generateVerdictMemoPDF({
        memo: data.memo,
        property: merged,
        verdicts: results.filter(r => r.viable),
      });
      setMemoState("ready");
      setTimeout(() => setMemoState(null), 3200);
    } catch (e) {
      setMemoState("error");
      setTimeout(() => setMemoState(null), 3200);
    }
  };

  if (!property) return null;

  // Save property + verdicts to Dashboard.
  // Uses same localStorage key + shape as BRRRR/Flip/MF calculator saves so the
  // Dashboard's existing merge logic picks it up automatically. Best strategy
  // (by verdict rank) is stored as the headline verdict.
  const saveToDashboard = () => {
    if (saved || !merged?.address) return;
    // Save is a Pro feature — free tier gets the upgrade modal instead.
    if (!freeTier.canSave) {
      trackSaveToDashboard("blocked_free");
      trackUpgradeModalOpen("save");
      setShowSaveGate(true);
      return;
    }
    try {
      const viable = results.filter(r => r.viable);
      const rank = { STRONG: 3, GO: 2, CAUTION: 1, PASS: 0 };
      const best = [...viable].sort((a, b) => (rank[b.verdict?.label] || 0) - (rank[a.verdict?.label] || 0))[0];
      const deal = {
        id: Date.now(),
        type: "property",
        name: merged.address,
        address: merged.address,
        savedAt: new Date().toISOString(),
        inputs: {
          purchasePrice: merged.purchasePrice,
          sqft: merged.sqft,
          beds: merged.beds,
          baths: merged.baths,
          units: merged.units,
          rentEstimate: merged.rentEstimate,
          zoning: merged.zoning,
          city: merged.city,
          province: merged.province,
        },
        results: {
          verdicts: viable.map(r => ({
            key: r.key, name: r.name, verdict: r.verdict?.label,
            headline: r.headline, subhead: r.subhead,
          })),
          bestStrategy: best?.name || null,
          bestHeadline: best?.headline || null,
        },
        verdict: best ? `${best.name} · ${best.verdict?.label || ""}` : "No viable strategy",
      };
      const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
      existing.unshift(deal);
      localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
      trackSaveToDashboard("success");
      setSaveState("success");
    } catch (e) {
      // localStorage disabled (Safari private mode etc) — show error toast.
      trackSaveToDashboard("error");
      setSaveState("error");
    }
  };

  const openCalculator = (r) => {
    trackVerdictCardClick(r.key, r.verdict?.label);
    try {
      sessionStorage.setItem("rde_strategy_prefill", JSON.stringify({
        source: "property-verdicts",
        ts: Date.now(),
        ...r.prefill,
      }));
    } catch {}
    navigate(r.route);
  };

  // ── Supporting tools row ──
  // Rehab, Tax, and Qualify aren't strategy verdicts — they're supporting
  // calculators. But once a user has picked a property, they often want to
  // drop in and see one specific number (rehab budget, tax impact, mortgage
  // qualification). Same prefill contract as the verdict cards.
  const openTool = (strategy, extra = {}) => {
    trackToolClick(strategy);
    try {
      sessionStorage.setItem("rde_strategy_prefill", JSON.stringify({
        source: "property-tools",
        ts: Date.now(),
        strategy,
        address:       property?.address,
        purchasePrice: property?.purchasePrice,
        sqft:          property?.sqft,
        monthlyRent:   property?.rentEstimate,
        province:      property?.province,
        propertyType:  property?.propertyType || "residential",
        ...extra,
      }));
    } catch {}
    const routes = { rehab: "/rehab", tax: "/tax", qualify: "/qualify" };
    navigate(routes[strategy] || "/");
  };

  const tools = [
    { key: "rehab",   icon: "🔨", label: "Rehab Budget",   sub: "Scope-based cost estimate" },
    { key: "tax",     icon: "📊", label: "Tax Impact",     sub: "Depreciation & PAL rules" },
    { key: "qualify", icon: "🏦", label: "Qualify",        sub: "GDS/TDS + stress test" },
  ];

  return (
    <div className="sv-wrap">
      {/* Free-tier gate modal — fires when a free user clicks Save. */}
      <FreeTierUpgradeModal open={showSaveGate} reason="save" onClose={() => setShowSaveGate(false)} />

      {/* ── Save toast ── */}
      {saveState === "success" && (
        <div className="sv-toast" role="status">
          <div className="sv-toast-icon">✓</div>
          <div className="sv-toast-body">
            <div className="sv-toast-title">Saved to Dashboard</div>
            <a className="sv-toast-link" onClick={(e) => { e.preventDefault(); navigate("/dashboard"); }}>
              View Dashboard →
            </a>
          </div>
          <button className="sv-toast-close" onClick={() => setSaveState(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {saveState === "error" && (
        <div className="sv-toast err" role="alert">
          <div className="sv-toast-icon">!</div>
          <div className="sv-toast-body">
            <div className="sv-toast-title">Couldn't save</div>
            <div style={{ fontSize: 11.5, color: "var(--sub)" }}>
              Storage may be disabled (private browsing?). Try again or use a normal window.
            </div>
          </div>
          <button className="sv-toast-close" onClick={() => setSaveState(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <style>{`
        .sv-wrap { margin: 20px 0 24px; }
        .sv-head {
          display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px;
          padding-bottom: 10px; border-bottom: 1px solid var(--borderf);
        }
        .sv-title {
          font-size: 11px; font-weight: 700; color: var(--brass);
          text-transform: uppercase; letter-spacing: 1.6px;
        }
        .sv-sub { font-size: 12px; color: var(--sub); font-weight: 500; flex: 1; }
        .sv-save {
          font-family: 'Geist Mono', monospace;
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
          padding: 6px 12px; border-radius: 6px;
          background: var(--brass); color: #fff;
          border: 1px solid var(--brass);
          cursor: pointer;
        }
        .sv-save:hover:not(:disabled) { background: var(--brass-2); border-color: var(--brass-2); }
        .sv-save.saved {
          background: rgba(52, 217, 138, 0.12);
          color: var(--green); border-color: rgba(52, 217, 138, 0.3);
          cursor: default;
        }
        .sv-save.disabled { opacity: 0.5; cursor: not-allowed; }

        /* Share verdict button — sits next to Save. Royal-blue accent to
           distinguish it from the brass Save button. */
        .sv-share {
          font-family: 'Geist Mono', monospace;
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
          padding: 6px 12px; border-radius: 6px;
          background: transparent; color: var(--royal);
          border: 1px solid var(--royal);
          cursor: pointer; margin-right: 8px;
        }
        .sv-share:hover:not(:disabled) {
          background: var(--royal); color: #fff;
        }
        .sv-share.copied {
          background: rgba(52, 217, 138, 0.12);
          color: var(--green); border-color: rgba(52, 217, 138, 0.4);
          cursor: default;
        }
        .sv-share:disabled { opacity: 0.5; cursor: not-allowed; }

        /* AI Memo button — brass filled, sits between Share and Save. Loading
           state has a subtle pulse so the user knows something's happening. */
        .sv-memo {
          font-family: 'Geist Mono', monospace;
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
          padding: 6px 12px; border-radius: 6px;
          background: linear-gradient(135deg, var(--brass), var(--brass-2));
          color: #0a1128; border: 1px solid var(--brass);
          cursor: pointer; margin-right: 8px;
        }
        .sv-memo:hover:not(:disabled) { filter: brightness(1.08); }
        .sv-memo.loading {
          background: rgba(212,175,55,0.15); color: var(--brass-2);
          border-color: rgba(212,175,55,0.35);
          animation: sv-memo-pulse 1.4s ease-in-out infinite;
        }
        .sv-memo.ready {
          background: rgba(52, 217, 138, 0.15); color: var(--green);
          border-color: rgba(52, 217, 138, 0.4);
        }
        .sv-memo.error {
          background: rgba(220, 38, 38, 0.10); color: var(--red);
          border-color: rgba(220, 38, 38, 0.35);
        }
        .sv-memo:disabled { opacity: 0.55; cursor: not-allowed; }
        @keyframes sv-memo-pulse {
          0%, 100% { opacity: 0.85; } 50% { opacity: 1; }
        }
        .sv-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 1100px) { .sv-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .sv-grid { grid-template-columns: 1fr; } }

        .sv-card {
          background: var(--card);
          border: 1px solid var(--borderf);
          border-radius: 10px;
          padding: 14px 14px 12px;
          display: flex; flex-direction: column;
          transition: border-color 160ms, transform 160ms, box-shadow 200ms;
        }
        .sv-card:hover:not(.disabled) {
          border-color: var(--brass);
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -12px rgba(212, 175, 55, 0.28);
        }
        .sv-card.disabled { opacity: 0.55; }

        .sv-cardhead {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .sv-cardname {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700; color: var(--text);
        }
        .sv-icon { font-size: 15px; }
        .sv-verdict {
          font-family: var(--font-mono);
          font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
          padding: 3px 8px; border-radius: 4px;
          color: #fff;
        }
        .sv-headline {
          font-family: var(--font-mono);
          font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
          color: var(--text); line-height: 1.1; margin-bottom: 3px;
        }
        .sv-subhead { font-size: 11.5px; color: var(--sub); margin-bottom: 10px; }
        .sv-metrics {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;
          padding: 8px 0; border-top: 1px dashed var(--borderf);
        }
        .sv-metric { display: flex; flex-direction: column; }
        .sv-mlabel {
          font-size: 9.5px; color: var(--dim); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .sv-mvalue {
          font-family: var(--font-mono);
          font-size: 12.5px; font-weight: 700; color: var(--text);
          letter-spacing: -0.2px;
        }
        .sv-cta {
          margin-top: 10px; width: 100%;
          background: var(--card2);
          border: 1px solid var(--borderf);
          border-radius: 6px; padding: 8px 10px;
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 700;
          color: var(--text);
          cursor: pointer;
          text-align: center;
        }
        .sv-card:hover .sv-cta {
          background: var(--brass);
          color: #fff;
          border-color: var(--brass);
        }
        .sv-na {
          padding: 14px 12px 12px; text-align: left;
          font-size: 11.5px; color: var(--sub); line-height: 1.5;
        }
        .sv-na-msg {
          font-size: 11.5px; color: var(--sub); font-style: italic;
          margin-bottom: 8px; line-height: 1.4;
        }
        .sv-na-fields { display: flex; flex-direction: column; gap: 6px; }
        .sv-na-field {
          display: flex; align-items: center; gap: 6px;
        }
        .sv-na-label {
          font-size: 9.5px; font-weight: 700; color: var(--brass-2);
          text-transform: uppercase; letter-spacing: 0.4px;
          font-family: 'Geist Mono', monospace;
          flex-shrink: 0; min-width: 66px;
        }
        .sv-na-input {
          flex: 1; padding: 5px 8px;
          font-family: 'Geist Mono', monospace;
          font-size: 12px; font-weight: 600;
          background: rgba(212,175,55,0.05);
          border: 1px solid rgba(212,175,55,0.20);
          border-radius: 4px;
          color: var(--text);
          outline: none;
          transition: border-color 120ms, background 120ms;
          min-width: 0;
        }
        .sv-na-input:focus {
          border-color: var(--brass);
          background: rgba(212,175,55,0.10);
        }
        .sv-na-input::placeholder { color: var(--dim); font-weight: 500; }
        .sv-na-hint {
          margin-top: 6px; font-size: 10px; color: var(--dim);
          font-family: 'Geist Mono', monospace; letter-spacing: 0.3px;
        }

        /* ── Save toast ── */
        .sv-toast {
          position: fixed;
          top: 76px; right: 24px;
          z-index: 10001;
          min-width: 280px; max-width: 380px;
          padding: 12px 14px 12px 12px;
          background: #ffffff;
          border: 1px solid var(--borderf);
          border-left: 4px solid var(--green);
          border-radius: 8px;
          box-shadow: 0 20px 40px -12px rgba(15,23,42,0.25), 0 0 0 1px rgba(15,23,42,0.04);
          display: flex; align-items: center; gap: 10px;
          animation: sv-toast-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .sv-toast.err { border-left-color: var(--red); }
        @keyframes sv-toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .sv-toast-icon {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(52, 217, 138, 0.15);
          color: var(--green);
          font-weight: 800; font-family: 'Geist Mono', monospace;
          flex-shrink: 0;
        }
        .sv-toast.err .sv-toast-icon {
          background: rgba(220, 38, 38, 0.12);
          color: var(--red);
        }
        .sv-toast-body { flex: 1; min-width: 0; }
        .sv-toast-title {
          font-size: 13px; font-weight: 700; color: var(--text);
          margin-bottom: 1px;
        }
        .sv-toast-link {
          font-size: 11.5px; color: var(--royal); font-weight: 600;
          cursor: pointer; text-decoration: none;
        }
        .sv-toast-link:hover { text-decoration: underline; }
        .sv-toast-close {
          background: none; border: none; cursor: pointer;
          padding: 2px 6px; color: var(--dim); font-size: 16px;
          flex-shrink: 0;
        }
        .sv-toast-close:hover { color: var(--text); }

        /* ── Supporting tools row ── */
        .sv-tools-head {
          display: flex; align-items: baseline; gap: 10px;
          margin: 18px 0 10px;
          padding-bottom: 6px; border-bottom: 1px dashed var(--borderf);
        }
        .sv-tools-title {
          font-size: 10px; font-weight: 700; color: var(--sub);
          text-transform: uppercase; letter-spacing: 1.2px;
        }
        .sv-tools-sub { font-size: 11.5px; color: var(--dim); }
        .sv-tools-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 720px) { .sv-tools-row { grid-template-columns: 1fr; } }
        .sv-tool {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: var(--card);
          border: 1px solid var(--borderf);
          border-radius: 8px;
          cursor: pointer;
          text-align: left; width: 100%;
          font-family: inherit;
          transition: border-color 160ms, transform 160ms, box-shadow 200ms;
        }
        .sv-tool:hover {
          border-color: var(--royal);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px -12px rgba(33, 85, 205, 0.28);
        }
        .sv-tool-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(33, 85, 205, 0.08);
          font-size: 15px;
        }
        .sv-tool-label { font-size: 12.5px; font-weight: 700; color: var(--text); line-height: 1.2; }
        .sv-tool-sub   { font-size: 10.5px; color: var(--sub); margin-top: 2px; }
        .sv-tool-arrow { margin-left: auto; color: var(--dim); font-size: 14px; }
        .sv-tool:hover .sv-tool-arrow { color: var(--royal); }
      `}</style>

      <div className="sv-head">
        <div className="sv-title">▸ STRATEGY VERDICTS</div>
        <div className="sv-sub">Same address, four strategies, one page.</div>

        {/* Share button — pairs with Save. Copies /verdict/[b64] URL to clipboard.
            Everyone can share, even free tier — this is the viral acquisition loop. */}
        <button
          className={`sv-share ${shareState === "copied" ? "copied" : ""}`}
          onClick={shareVerdict}
          disabled={!merged?.address}
          type="button"
          title="Copy shareable link to clipboard"
        >
          {shareState === "copied" ? "✓ LINK COPIED" : shareState === "error" ? "⚠ TRY AGAIN" : "↗ SHARE VERDICT"}
        </button>

        {/* AI Memo — AI-authored 1-page investment memo PDF. Pro-gated. */}
        <button
          className={`sv-memo ${memoState || ""}`}
          onClick={generateMemo}
          disabled={!merged?.address || memoState === "loading"}
          type="button"
          title="Generate branded PDF investment memo"
        >
          {memoState === "loading"
            ? "🤖 GENERATING…"
            : memoState === "ready"
              ? "✓ DOWNLOADED"
              : memoState === "error"
                ? "⚠ TRY AGAIN"
                : "🤖 AI MEMO PDF"}
        </button>

        <button
          className={`sv-save ${saved ? "saved" : ""} ${!property?.address ? "disabled" : ""}`}
          onClick={saveToDashboard}
          disabled={saved || !property?.address}
          type="button"
        >
          {saved ? "✓ SAVED TO DASHBOARD" : "＋ SAVE TO DASHBOARD"}
        </button>
      </div>

      <div className="sv-grid" data-verdict-grid="1">
        {results.map((r) => (
          <div key={r.key} className={`sv-card ${r.viable ? "" : "disabled"}`} onClick={r.viable ? () => openCalculator(r) : undefined}>
            <div className="sv-cardhead">
              <div className="sv-cardname">
                <span className="sv-icon">{r.icon || "•"}</span>
                <span>{r.name || r.key.toUpperCase()}</span>
              </div>
              {r.viable && r.verdict && (
                <div className="sv-verdict" style={{ background: r.verdict.color }}>
                  {r.verdict.label}
                </div>
              )}
            </div>

            {r.viable ? (
              <>
                <div className="sv-headline">{r.headline}</div>
                <div className="sv-subhead">{r.subhead}</div>
                <div className="sv-metrics">
                  {r.metrics.map((m, i) => (
                    <div key={i} className="sv-metric">
                      <div className="sv-mlabel">{m.label}</div>
                      <div className="sv-mvalue">{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="sv-cta">Open in calculator →</div>
              </>
            ) : (
              <EmptyStateForm reason={r.reason} overrides={overrides} setOverrides={setOverrides} />
            )}
          </div>
        ))}
      </div>

      {/* ── Supporting tools row — Rehab / Tax / Qualify ── */}
      <div className="sv-tools-head">
        <div className="sv-tools-title">▸ TOOLS FOR THIS PROPERTY</div>
        <div className="sv-tools-sub">Drop in with the property context pre-loaded.</div>
      </div>
      <div className="sv-tools-row">
        {tools.map((t) => (
          <button key={t.key} className="sv-tool" onClick={() => openTool(t.key)} type="button">
            <span className="sv-tool-icon">{t.icon}</span>
            <span>
              <div className="sv-tool-label">{t.label}</div>
              <div className="sv-tool-sub">{t.sub}</div>
            </span>
            <span className="sv-tool-arrow">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * EmptyStateForm — when a verdict card can't fire, parse the reason string
 * to figure out which fields are missing, then render inline mini inputs
 * for those fields. Values live in the parent's `overrides` state; changing
 * them re-runs `runAllStrategies` and the card lights up.
 *
 * Detection is keyword-based against the reasons emitted by strategyMath.js:
 *   "Need purchase price + rent"       → shows purchasePrice + rentEstimate
 *   "Need purchase, sqft, and rent…"   → shows all three
 *   "Need unit count (or MF zoning…)"  → shows units
 *   etc.
 */
function EmptyStateForm({ reason, overrides, setOverrides }) {
  const r = String(reason || "").toLowerCase();
  const missing = {
    purchasePrice: /purchase/.test(r) && !/rehab/.test(r),
    rentEstimate:  /rent/.test(r) && !/roll/.test(r),
    sqft:          /sqft|square/.test(r),
    units:         /unit/.test(r),
  };
  const anyMissing = Object.values(missing).some(Boolean);

  if (!anyMissing) {
    // Some reasons (e.g. "SFH / small — see Buy & Hold") are informational,
    // not actionable. Show the reason plain.
    return <div className="sv-na"><div className="sv-na-msg">{reason}</div></div>;
  }

  const upd = (k) => (e) => setOverrides((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="sv-na">
      <div className="sv-na-msg">{reason}. Fill in below to run this strategy.</div>
      <div className="sv-na-fields">
        {missing.purchasePrice && (
          <div className="sv-na-field">
            <span className="sv-na-label">Purchase $</span>
            <input
              className="sv-na-input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 850000"
              value={overrides.purchasePrice ?? ""}
              onChange={upd("purchasePrice")}
            />
          </div>
        )}
        {missing.rentEstimate && (
          <div className="sv-na-field">
            <span className="sv-na-label">Rent $/mo</span>
            <input
              className="sv-na-input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 3200"
              value={overrides.rentEstimate ?? ""}
              onChange={upd("rentEstimate")}
            />
          </div>
        )}
        {missing.sqft && (
          <div className="sv-na-field">
            <span className="sv-na-label">Sqft</span>
            <input
              className="sv-na-input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 1400"
              value={overrides.sqft ?? ""}
              onChange={upd("sqft")}
            />
          </div>
        )}
        {missing.units && (
          <div className="sv-na-field">
            <span className="sv-na-label">Units</span>
            <input
              className="sv-na-input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 6"
              value={overrides.units ?? ""}
              onChange={upd("units")}
            />
          </div>
        )}
      </div>
      <div className="sv-na-hint">Recomputes live · overrides don't leave this panel</div>
    </div>
  );
}
