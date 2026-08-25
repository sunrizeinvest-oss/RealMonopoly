import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useDocMeta } from "./lib/seo";
import { useFreeTier } from "./lib/freeTier";
import { FreeTierUpgradeModal } from "./components/FreeTierBanner";
import BuyBoxChat from "./components/BuyBoxChat";
import TopNav from "./components/TopNav";
import {
  ASSET_CLASSES, CA_CITIES, STRATEGIES, EMPTY_BUYBOX, VERDICT_STYLES,
  loadBuyBoxes, saveBuyBox, deleteBuyBox, parseAddressList, scoreProperty,
} from "./lib/buyBox";
import { runAllStrategies } from "./lib/strategyMath";
import { trackPropertyLookup, trackUpgradeModalOpen } from "./lib/analytics";

/**
 * BuyBox — the /buybox surface for saved investment criteria + batch address
 * scoring. Inspired by the "Off-Market Deal Sourcing" workflow but
 * implemented against RizeAI's own underwriting engine — user supplies the
 * candidate address list (from their own sourcing), we score + rank against
 * their saved Buy Box.
 *
 * Flow:
 *   1. Define / edit / delete Buy Boxes (asset class, cities, price range,
 *      strategy preference, unit count min).
 *   2. Pick a Buy Box + paste candidate addresses (one per line, up to 20).
 *   3. Sequential lookups through /api/property-lookup → strategy verdicts →
 *      buy-box scoring → ranked results.
 *   4. Each result links to /property for full detail.
 *
 * Free-tier metering applies — batch consumes the same 5/mo lookup counter
 * as one-off /property searches.
 */
export default function BuyBox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const freeTier = useFreeTier();

  useDocMeta({
    title: "Buy Box · RizeAI",
    description: "Save your investment criteria. Paste candidate addresses. Get ranked deal matches with underwriting verdicts — all in one pass.",
  });

  const [boxes, setBoxes] = useState([]);
  const [editing, setEditing] = useState(null);        // { ...box } while editing
  const [selectedId, setSelectedId] = useState(null);  // active box for batch run
  const [addressText, setAddressText] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [waitlistState, setWaitlistState] = useState(null);   // null | "joined"
  const [batchSaved, setBatchSaved] = useState(false);

  useEffect(() => {
    setBoxes(loadBuyBoxes());
    // Reset save-batch flag on box switch
    setBatchSaved(false);
  }, []);
  useEffect(() => { setBatchSaved(false); }, [selectedId, results]);

  // Save the entire batch of results as a single Dashboard entry so the
  // broker can revisit their weekly deal review later. Uses the same
  // localStorage.rde_brrrr_deals bucket the Dashboard already merges.
  const saveBatchToDashboard = () => {
    if (!selectedBox || !results.length) return;
    try {
      const top = results.slice(0, 10);
      const deal = {
        id: Date.now(),
        type: "buybox_batch",
        name: `${selectedBox.name} · ${top.length} deals`,
        address: `${selectedBox.name} — batch of ${top.length}`,
        savedAt: new Date().toISOString(),
        inputs: {
          buyBoxName: selectedBox.name,
          cities: selectedBox.cities,
          strategy: selectedBox.strategy,
          priceMin: selectedBox.priceMin,
          priceMax: selectedBox.priceMax,
        },
        results: {
          totalAddresses: results.length,
          topMatches: top.map(r => ({
            address: r.address, score: r.score, verdict: r.verdict,
            bestStrategy: r.strategyResults?.find(s => s.viable)?.name,
            bestHeadline: r.strategyResults?.find(s => s.viable)?.headline,
          })),
        },
        verdict: `${top[0]?.score || 0}% top match · ${selectedBox.name}`,
      };
      const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
      existing.unshift(deal);
      localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
      setBatchSaved(true);
    } catch {}
  };

  // Waitlist signup for the auto-source MLS feature. Persists locally so
  // the CTA changes state, and posts to the leads API for founder followup.
  const joinAutoSourceWaitlist = async () => {
    if (waitlistState) return;
    setWaitlistState("joined");
    try { localStorage.setItem("rde_autosource_waitlist", "1"); } catch {}
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "buybox_autosource_waitlist",
          email: user?.email || "",
          intent: "auto-source-mls",
          message: "Wants MLS auto-source when live",
        }),
      });
    } catch {}
  };

  // Restore waitlist state on mount
  useEffect(() => {
    try { if (localStorage.getItem("rde_autosource_waitlist") === "1") setWaitlistState("joined"); } catch {}
  }, []);

  const selectedBox = boxes.find(b => b.id === selectedId) || null;
  const addressPreview = useMemo(() => parseAddressList(addressText), [addressText]);

  const startNewBox = () => setEditing({ ...EMPTY_BUYBOX });
  const startEditBox = (b) => setEditing({ ...b });
  const cancelEdit = () => setEditing(null);

  const saveEdit = () => {
    if (!editing.name.trim()) return;
    const next = saveBuyBox(editing);
    setBoxes(next);
    setEditing(null);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  };

  const removeBox = (id) => {
    if (!confirm("Delete this Buy Box? Its saved criteria will be lost.")) return;
    const next = deleteBuyBox(id);
    setBoxes(next);
    if (selectedId === id) setSelectedId(null);
  };

  const toggleInArray = (arr, id) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  /**
   * Run the batch: iterate candidate addresses sequentially through the
   * existing /api/property-lookup endpoint, run each through the local
   * strategy math, then score against the Buy Box. Sequential (not
   * parallel) because the lookup API isn't idempotent and Nominatim
   * enforces 1 req/sec anyway.
   */
  const runBatch = async () => {
    if (!selectedBox || batchRunning || !addressPreview.length) return;

    // Free-tier gate — each address in the batch counts against the 5/mo limit.
    // If the batch exceeds remaining lookups, block the whole run.
    if (!freeTier.isPaid && addressPreview.length > freeTier.remaining) {
      trackUpgradeModalOpen("lookup");
      setUpgradeModal("lookup");
      return;
    }

    setBatchRunning(true);
    setResults([]);
    setBatchProgress({ done: 0, total: addressPreview.length });

    const out = [];
    for (let i = 0; i < addressPreview.length; i++) {
      const addr = addressPreview[i];
      try {
        freeTier.incrementLookup();
        trackPropertyLookup(addr, isCanadianText(addr) ? "CA" : "US");
        const res = await fetch(`/api/property-lookup?address=${encodeURIComponent(addr)}`);
        const data = await res.json();
        const property = normalizeProperty(data, addr);
        const strategyResults = runAllStrategies(property);
        const scoreBundle = scoreProperty(property, selectedBox, strategyResults);
        out.push({ address: addr, property, strategyResults, ...scoreBundle });
      } catch (e) {
        out.push({ address: addr, error: e?.message || "lookup failed", score: 0, verdict: "POOR_FIT", breakdown: [] });
      }
      setBatchProgress({ done: i + 1, total: addressPreview.length });
    }

    // Sort by match score descending
    out.sort((a, b) => (b.score || 0) - (a.score || 0));
    setResults(out);
    setBatchRunning(false);
  };

  const openInProperty = (addr) => {
    navigate(`/property?addr=${encodeURIComponent(addr)}`);
  };

  return (
    <div className="bb-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="bb-body">
        <div className="bb-header">
          <div>
            <div className="bb-eyebrow">
              <span className="bb-eyebrow-dot" />
              INSIDER TOOL · BUY BOX
            </div>
            <h1 className="bb-h1">Your buy box. <span>Ranked matches.</span></h1>
            <p className="bb-sub">
              Save your investment criteria. Paste candidate addresses. Get ranked deal matches with underwriting verdicts — in one pass. Off-market sourcing scaffold: fill it with your list, RizeAI does the work.
            </p>
          </div>
        </div>

        {/* ── Buddy Chat — natural-language Buy Box builder ── */}
        <BuyBoxChat
          onExtracted={(criteria) => {
            // Merge extracted fields into the editor. Opens a new draft
            // pre-populated with what Buddy extracted, ready to save.
            const draft = { ...EMPTY_BUYBOX };
            const clamp = (v) => v ?? "";
            draft.name = criteria.name || "";
            draft.assetClasses = Array.isArray(criteria.assetClasses) ? criteria.assetClasses : [];
            draft.cities = Array.isArray(criteria.cities) ? criteria.cities : [];
            draft.priceMin = clamp(criteria.priceMin);
            draft.priceMax = clamp(criteria.priceMax);
            draft.capRateMin = clamp(criteria.capRateMin);
            draft.unitsMin = clamp(criteria.unitsMin);
            draft.strategy = criteria.strategy || "";
            draft.notes = criteria.notes || "";
            setEditing(draft);
            // Scroll editor into view smoothly so the user sees the auto-fill.
            setTimeout(() => {
              const el = document.querySelector(".bb-editor");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
        />

        {/* ── Buy Boxes list + editor ── */}
        <section className="bb-section">
          <div className="bb-section-head">
            <div className="bb-section-title">▸ Your Buy Boxes</div>
            <button className="bb-btn-primary" onClick={startNewBox} disabled={!!editing}>
              + New Buy Box
            </button>
          </div>

          {editing && (
            <BuyBoxEditor
              box={editing}
              onChange={setEditing}
              onSave={saveEdit}
              onCancel={cancelEdit}
              toggleInArray={toggleInArray}
            />
          )}

          {!editing && boxes.length === 0 && (
            <div className="bb-empty">
              <div className="bb-empty-icon">📥</div>
              <div className="bb-empty-title">No Buy Boxes yet</div>
              <div className="bb-empty-sub">Create your first Buy Box — asset classes, cities, price range, strategy preference. Then paste a list of candidate addresses to score.</div>
              <button className="bb-btn-primary" onClick={startNewBox}>+ Create Buy Box</button>
            </div>
          )}

          {!editing && boxes.length > 0 && (
            <div className="bb-boxes-grid">
              {boxes.map(b => (
                <div
                  key={b.id}
                  className={`bb-box-card ${selectedId === b.id ? "active" : ""}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <div className="bb-box-name">{b.name}</div>
                  <div className="bb-box-meta">
                    {b.strategy && <span className="bb-box-chip">{STRATEGIES.find(s => s.id === b.strategy)?.icon} {STRATEGIES.find(s => s.id === b.strategy)?.label}</span>}
                    {b.cities?.length > 0 && <span className="bb-box-chip">📍 {b.cities.length} {b.cities.length === 1 ? "city" : "cities"}</span>}
                    {(b.priceMin || b.priceMax) && (
                      <span className="bb-box-chip">
                        💰 {b.priceMin ? `$${(Number(b.priceMin)/1000).toFixed(0)}K` : "any"}
                        {" – "}
                        {b.priceMax ? `$${(Number(b.priceMax)/1000).toFixed(0)}K` : "any"}
                      </span>
                    )}
                    {b.assetClasses?.length > 0 && (
                      <span className="bb-box-chip">{ASSET_CLASSES.filter(a => b.assetClasses.includes(a.id)).slice(0,2).map(a => a.icon).join(" ")}</span>
                    )}
                  </div>
                  <div className="bb-box-actions">
                    <button onClick={(e) => { e.stopPropagation(); startEditBox(b); }} className="bb-btn-ghost">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); removeBox(b.id); }} className="bb-btn-ghost danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Auto-source placeholder ── */}
        {selectedBox && !editing && (
          <section className="bb-section">
            <div className="bb-autosource">
              <div className="bb-autosource-badge">▸ COMING SOON · REPLIERS MLS INTEGRATION</div>
              <div className="bb-autosource-title">Auto-source from MLS. <span>The one-message flow.</span></div>
              <div className="bb-autosource-body">
                One click → RizeAI sweeps every listing matching <b>{selectedBox.name}</b> across your target cities this week.
                Underwrites each. Ranks. Sends you the top 10 with 1-page memos. Runs weekly on schedule.
                <br /><br />
                <span style={{ color: "var(--sub)", fontSize: 12.5 }}>
                  Waiting on our MLS partner activation. Join the waitlist and you'll be one of the first to try it when it goes live.
                </span>
              </div>
              <button
                className="bb-btn-primary"
                onClick={joinAutoSourceWaitlist}
                disabled={waitlistState === "joined"}
              >
                {waitlistState === "joined" ? "✓ On the waitlist" : "Join waitlist →"}
              </button>
            </div>
          </section>
        )}

        {/* ── Batch runner ── */}
        {selectedBox && !editing && (
          <section className="bb-section">
            <div className="bb-section-head">
              <div className="bb-section-title">
                ▸ Run <span style={{ color: "var(--brass)" }}>{selectedBox.name}</span>
              </div>
              <div className="bb-section-sub">Paste addresses from your own sourcing (broker network, MLS export, LinkedIn scrape).</div>
            </div>

            <div className="bb-runner">
              <div className="bb-runner-instructions">
                Paste candidate addresses (one per line, up to 20). Each will be underwritten and scored against this Buy Box.
                {!freeTier.isPaid && (
                  <span style={{ color: "var(--brass-2)", fontWeight: 700 }}>
                    {" "}You have {freeTier.remaining} of 5 free lookups left this month.
                  </span>
                )}
              </div>

              <textarea
                className="bb-textarea"
                placeholder={`2424 Westmount Rd NW, Calgary AB\n17 Sunrise Blvd, Toronto ON\n310 Kingsway, Vancouver BC\n...`}
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                rows={7}
                disabled={batchRunning}
              />

              <div className="bb-runner-foot">
                <div className="bb-count-pill">
                  {addressPreview.length === 0
                    ? "No addresses yet"
                    : `${addressPreview.length} address${addressPreview.length === 1 ? "" : "es"} · ready to run`}
                </div>
                <button
                  className="bb-btn-primary lg"
                  onClick={runBatch}
                  disabled={batchRunning || !addressPreview.length}
                >
                  {batchRunning
                    ? `Running ${batchProgress.done}/${batchProgress.total}…`
                    : `Run batch → ${addressPreview.length} address${addressPreview.length === 1 ? "" : "es"}`}
                </button>
              </div>

              {batchRunning && (
                <div className="bb-progress">
                  <div className="bb-progress-bar" style={{ width: `${batchProgress.total ? (batchProgress.done/batchProgress.total)*100 : 0}%` }} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Ranked results ── */}
        {results.length > 0 && (
          <section className="bb-section">
            <div className="bb-section-head">
              <div className="bb-section-title">▸ Ranked Results · {results.length}</div>
              <button
                className={`bb-btn-primary ${batchSaved ? "saved" : ""}`}
                onClick={saveBatchToDashboard}
                disabled={batchSaved}
              >
                {batchSaved ? "✓ Saved to Dashboard" : "＋ Save this batch"}
              </button>
            </div>
            <div className="bb-section-sub-block">Sorted by match score. Click any card to open in the full underwriter.</div>

            <div className="bb-results">
              {results.map((r, i) => (
                <BuyBoxResult key={i} result={r} rank={i + 1} onOpen={() => openInProperty(r.address)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state after run with no results ── */}
        {!batchRunning && addressPreview.length === 0 && selectedBox && (
          <div className="bb-hint">
            <b>Tip:</b> paste a list of addresses from your MLS export, broker network, LinkedIn scrape, or wholesale list.
            RizeAI will run each through the full 4-strategy verdict + zoning specs + AI thesis and rank them against <b>{selectedBox.name}</b>.
          </div>
        )}
      </div>

      <FreeTierUpgradeModal
        open={!!upgradeModal}
        reason={upgradeModal}
        onClose={() => setUpgradeModal(null)}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BuyBoxEditor({ box, onChange, onSave, onCancel, toggleInArray }) {
  const upd = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
  return (
    <div className="bb-editor">
      <div className="bb-editor-field">
        <label>Name</label>
        <input
          className="bb-input"
          placeholder="e.g. Calgary infill duplexes under $850K"
          value={box.name}
          onChange={e => upd("name", e.target.value)}
        />
      </div>

      <div className="bb-editor-field">
        <label>Asset Classes · Select all that apply</label>
        <div className="bb-chips">
          {ASSET_CLASSES.map(a => (
            <button
              key={a.id}
              className={`bb-chip ${box.assetClasses.includes(a.id) ? "active" : ""}`}
              onClick={() => upd("assetClasses", toggleInArray(box.assetClasses, a.id))}
              type="button"
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bb-editor-field">
        <label>Cities · Where you're looking</label>
        <div className="bb-chips">
          {CA_CITIES.map(c => (
            <button
              key={c.id}
              className={`bb-chip ${box.cities.includes(c.id) ? "active" : ""}`}
              onClick={() => upd("cities", toggleInArray(box.cities, c.id))}
              type="button"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bb-editor-row">
        <div className="bb-editor-field">
          <label>Price Min (CAD)</label>
          <input
            className="bb-input"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 500000"
            value={box.priceMin}
            onChange={e => upd("priceMin", e.target.value)}
          />
        </div>
        <div className="bb-editor-field">
          <label>Price Max (CAD)</label>
          <input
            className="bb-input"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 1500000"
            value={box.priceMax}
            onChange={e => upd("priceMax", e.target.value)}
          />
        </div>
      </div>

      <div className="bb-editor-row">
        <div className="bb-editor-field">
          <label>Preferred Strategy</label>
          <div className="bb-chips">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                className={`bb-chip ${box.strategy === s.id ? "active" : ""}`}
                onClick={() => upd("strategy", box.strategy === s.id ? "" : s.id)}
                type="button"
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bb-editor-row">
        <div className="bb-editor-field">
          <label>Min Units (for MF)</label>
          <input
            className="bb-input"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 6"
            value={box.unitsMin}
            onChange={e => upd("unitsMin", e.target.value)}
          />
        </div>
        <div className="bb-editor-field">
          <label>Min Cap Rate (%)</label>
          <input
            className="bb-input"
            type="number"
            inputMode="numeric"
            step="0.25"
            placeholder="e.g. 5.5"
            value={box.capRateMin}
            onChange={e => upd("capRateMin", e.target.value)}
          />
        </div>
      </div>

      <div className="bb-editor-field">
        <label>Notes / Thesis (optional)</label>
        <textarea
          className="bb-textarea sm"
          placeholder="e.g. Looking for value-add near LRT stations. Cap ex 15%. Assume 6.5% financing."
          rows={3}
          value={box.notes}
          onChange={e => upd("notes", e.target.value)}
        />
      </div>

      <div className="bb-editor-actions">
        <button className="bb-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="bb-btn-primary" onClick={onSave} disabled={!box.name.trim()}>
          {box.id ? "Save changes" : "Create Buy Box"}
        </button>
      </div>
    </div>
  );
}

function BuyBoxResult({ result, rank, onOpen }) {
  const style = VERDICT_STYLES[result.verdict] || VERDICT_STYLES.POOR_FIT;
  const bestStrategy = result.strategyResults?.find(s => s.viable) || null;

  return (
    <div className="bb-result-card" onClick={onOpen}>
      <div className="bb-result-rank">#{rank}</div>
      <div className="bb-result-main">
        <div className="bb-result-addr">{result.address}</div>
        {result.error ? (
          <div className="bb-result-error">⚠ {result.error}</div>
        ) : (
          <div className="bb-result-meta">
            {bestStrategy && (
              <span className="bb-result-strat">
                {bestStrategy.icon} {bestStrategy.name}: <b>{bestStrategy.headline}</b>
              </span>
            )}
            <div className="bb-result-breakdown">
              {result.breakdown?.slice(0, 4).map((b, i) => (
                <span key={i} className={`bb-result-crumb ${b.ok === true ? "ok" : b.ok === false ? "bad" : ""}`}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="bb-result-score">
        <div className="bb-result-score-val" style={{ color: style.color }}>
          {result.score}
        </div>
        <div className="bb-result-score-verdict" style={{ background: style.color }}>
          {style.label}
        </div>
      </div>
      <div className="bb-result-arrow">→</div>
    </div>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function isCanadianText(addr) {
  return /\b(canada|calgary|edmonton|vancouver|toronto|ottawa|mississauga|hamilton|montr[eé]al|winnipeg|halifax|ab|bc|on|qc|mb|ns|nb|sk|nl|pe|nt|nu|yt)\b/i.test(String(addr || ""));
}

function normalizeProperty(data, fallbackAddr) {
  if (!data) return { address: fallbackAddr };
  return {
    address:           data.address        || fallbackAddr,
    city:              data.city           || "",
    province:          data.province       || "",
    purchasePrice:     data.listPrice      || data.estimatedValue,
    estimatedValue:    data.estimatedValue,
    rentEstimate:      data.rentEstimate,
    sqft:              data.sqft,
    beds:              data.beds,
    baths:             data.baths,
    units:             data.units,
    propertyTaxAnnual: data.propertyTaxAnnual,
    zoning:            data.zoning,
    propertyType:      data.propertyType,
  };
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
  .bb-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .bb-body { max-width: 1200px; margin: 0 auto; padding: 48px 24px 96px; }

  .bb-header { margin-bottom: 40px; }
  .bb-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Geist Mono', monospace;
    font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
    color: var(--brass-2);
    background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28);
    padding: 6px 12px; border-radius: 4px; margin-bottom: 12px;
  }
  .bb-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .bb-h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--text); letter-spacing: -1.3px; line-height: 1.1; margin: 0 0 12px; }
  .bb-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .bb-sub { font-size: 15px; color: var(--sub); line-height: 1.6; max-width: 780px; margin: 0; }

  .bb-section { margin-bottom: 36px; }
  .bb-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding-bottom: 10px; margin-bottom: 16px; border-bottom: 1px solid var(--borderf); flex-wrap: wrap; }
  .bb-section-title { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--brass); text-transform: uppercase; letter-spacing: 1.4px; }
  .bb-section-title span { color: var(--brass); }
  .bb-section-sub { font-size: 12px; color: var(--sub); }

  .bb-btn-primary {
    padding: 8px 16px; border-radius: 6px;
    background: var(--brass); color: #0a1128; border: 1px solid var(--brass);
    font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800;
    letter-spacing: 0.6px; text-transform: uppercase;
    cursor: pointer;
  }
  .bb-btn-primary.lg { padding: 11px 22px; font-size: 12.5px; letter-spacing: 0.8px; }
  .bb-btn-primary:hover:not(:disabled) { background: var(--brass-2); border-color: var(--brass-2); }
  .bb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .bb-btn-ghost {
    padding: 6px 12px; border-radius: 5px;
    background: transparent; color: var(--sub); border: 1px solid var(--borderf);
    font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700;
    letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer;
  }
  .bb-btn-ghost:hover { color: var(--text); border-color: var(--sub); }
  .bb-btn-ghost.danger { color: var(--red); }
  .bb-btn-ghost.danger:hover { color: #fff; background: var(--red); border-color: var(--red); }

  .bb-empty {
    text-align: center; padding: 56px 24px; background: var(--card); border: 1px dashed var(--borderf); border-radius: 10px;
  }
  .bb-empty-icon { font-size: 40px; margin-bottom: 12px; }
  .bb-empty-title { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .bb-empty-sub { font-size: 13.5px; color: var(--sub); margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.6; }

  .bb-boxes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .bb-box-card {
    padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf);
    border-radius: 10px; cursor: pointer; transition: border-color 160ms, transform 160ms, box-shadow 200ms;
  }
  .bb-box-card:hover { border-color: var(--brass); transform: translateY(-2px); box-shadow: 0 12px 24px -12px rgba(212,175,55,0.28); }
  .bb-box-card.active { border-color: var(--brass); background: rgba(212,175,55,0.05); }
  .bb-box-name { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
  .bb-box-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .bb-box-chip {
    padding: 3px 8px; border-radius: 4px;
    background: rgba(212,175,55,0.08); color: var(--brass-2);
    font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.3px;
  }
  .bb-box-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px dashed var(--borderf); }

  .bb-editor {
    background: var(--card); border: 1px solid var(--brass);
    border-radius: 10px; padding: 24px;
  }
  .bb-editor-field { margin-bottom: 18px; }
  .bb-editor-field label { display: block; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; }
  .bb-editor-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media (max-width: 640px) { .bb-editor-row { grid-template-columns: 1fr; } }

  .bb-input {
    width: 100%; padding: 10px 12px; border-radius: 6px;
    background: rgba(15,23,42,0.03); border: 1px solid var(--borderf);
    color: var(--text); font-family: inherit; font-size: 14px;
    outline: none; transition: border-color 120ms, background 120ms;
  }
  .bb-input:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }

  .bb-textarea {
    width: 100%; padding: 12px 14px; border-radius: 6px;
    background: rgba(15,23,42,0.03); border: 1px solid var(--borderf);
    color: var(--text); font-family: 'Geist Mono', monospace; font-size: 13px; line-height: 1.6;
    outline: none; resize: vertical; transition: border-color 120ms, background 120ms;
  }
  .bb-textarea.sm { font-family: inherit; font-size: 13.5px; }
  .bb-textarea:focus { border-color: var(--brass); background: rgba(212,175,55,0.03); }

  .bb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .bb-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 999px;
    background: rgba(15,23,42,0.03); border: 1px solid var(--borderf);
    color: var(--sub);
    font-family: inherit; font-size: 12.5px; font-weight: 600;
    cursor: pointer;
    transition: border-color 120ms, background 120ms, color 120ms;
  }
  .bb-chip:hover { color: var(--text); border-color: var(--sub); }
  .bb-chip.active { background: rgba(212,175,55,0.10); border-color: var(--brass); color: var(--brass-2); }

  .bb-editor-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid var(--borderf); }

  .bb-runner { padding: 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .bb-runner-instructions { font-size: 13px; color: var(--sub); margin-bottom: 12px; line-height: 1.55; }
  .bb-runner-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 12px; flex-wrap: wrap; }
  .bb-count-pill {
    font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700;
    color: var(--sub); letter-spacing: 0.4px;
  }

  .bb-progress { margin-top: 12px; height: 4px; background: rgba(15,23,42,0.06); border-radius: 2px; overflow: hidden; }
  .bb-progress-bar { height: 100%; background: linear-gradient(90deg, var(--brass), var(--brass-2)); transition: width 240ms; }

  .bb-results { display: flex; flex-direction: column; gap: 10px; }
  .bb-result-card {
    display: grid; grid-template-columns: 42px 1fr auto 24px; gap: 16px; align-items: center;
    padding: 14px 18px; background: var(--card); border: 1px solid var(--borderf);
    border-radius: 10px; cursor: pointer; transition: border-color 160ms, transform 160ms;
  }
  .bb-result-card:hover { border-color: var(--brass); transform: translateX(2px); }
  .bb-result-rank {
    font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--brass);
    letter-spacing: 0.4px;
  }
  .bb-result-main { min-width: 0; }
  .bb-result-addr { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bb-result-error { font-size: 12px; color: var(--red); font-style: italic; }
  .bb-result-meta { display: flex; flex-direction: column; gap: 4px; }
  .bb-result-strat { font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); }
  .bb-result-strat b { color: var(--text); }
  .bb-result-breakdown { display: flex; flex-wrap: wrap; gap: 4px; }
  .bb-result-crumb {
    font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700;
    padding: 2px 6px; border-radius: 3px;
    color: var(--sub); background: rgba(15,23,42,0.04); border: 1px solid var(--borderf);
    letter-spacing: 0.3px;
  }
  .bb-result-crumb.ok  { color: var(--green); background: rgba(52,217,138,0.06); border-color: rgba(52,217,138,0.20); }
  .bb-result-crumb.bad { color: var(--red);   background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.20); }
  .bb-result-score { text-align: right; }
  .bb-result-score-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; line-height: 1; margin-bottom: 4px; }
  .bb-result-score-verdict {
    display: inline-block; padding: 3px 8px; border-radius: 4px;
    font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800;
    color: #fff; letter-spacing: 0.6px;
  }
  .bb-result-arrow { color: var(--dim); font-size: 16px; text-align: right; }
  .bb-result-card:hover .bb-result-arrow { color: var(--brass); }

  .bb-hint {
    background: rgba(33,85,205,0.05); border: 1px solid rgba(33,85,205,0.15); border-left: 3px solid var(--royal);
    padding: 14px 18px; border-radius: 6px;
    font-size: 13px; color: var(--text); line-height: 1.65;
  }
  .bb-hint b { color: var(--royal); }

  /* Section sub-block (paragraph under the head row) */
  .bb-section-sub-block { font-size: 13px; color: var(--sub); margin-bottom: 16px; line-height: 1.55; }

  /* Auto-source waitlist card */
  .bb-autosource {
    padding: 22px 24px;
    background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.05));
    border: 1px solid rgba(212,175,55,0.30);
    border-left: 3px solid var(--brass);
    border-radius: 10px;
  }
  .bb-autosource-badge {
    display: inline-block;
    font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700;
    letter-spacing: 1.4px; text-transform: uppercase; color: var(--brass-2);
    background: rgba(212,175,55,0.10); border: 1px solid rgba(212,175,55,0.30);
    padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;
  }
  .bb-autosource-title { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin-bottom: 10px; }
  .bb-autosource-title span { color: var(--brass); font-style: italic; font-weight: 700; }
  .bb-autosource-body { font-size: 13.5px; color: var(--text); line-height: 1.65; margin-bottom: 16px; max-width: 720px; }
  .bb-autosource-body b { color: var(--brass-2); }

  /* Saved-batch button variant */
  .bb-btn-primary.saved {
    background: rgba(52, 217, 138, 0.12);
    color: var(--green);
    border-color: rgba(52, 217, 138, 0.30);
    cursor: default;
  }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
