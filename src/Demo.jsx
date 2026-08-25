/**
 * Demo — /demo — Loom recording mode.
 *
 * NOT a customer-facing page. This is for the founder to record a 60-second
 * product walkthrough Loom that gets embedded on /brokers + dropped into
 * cold LinkedIn outreach.
 *
 * Lays out the recording flow:
 *   - The word-for-word script (read while clicking)
 *   - Three deep-linked buttons that pre-populate each demo step
 *   - Timing cues per beat (5s / 15s / 40s)
 *
 * Workflow: open /demo in one window. Open OBS/Loom. Hit record. Read
 * the script. Click buttons in order. Stop recording. Upload to Loom.
 * Paste the public URL into Brokers.jsx (replacing the placeholder).
 */

import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

export default function Demo() {
  useDocMeta({
    title: "Demo mode · RizeAI",
    description: "Founder recording mode — Loom script + deep-linked demo flow.",
  });
  const navigate = useNavigate();

  const css = `
    .dm-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh}
    body:has(.dm-page){background:#0a1128}
    .dm-wrap{max-width:1180px;margin:0 auto;padding:48px 24px 80px}
    .dm-head{margin-bottom:36px}
    .dm-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#dc2626;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.4);padding:7px 14px;border-radius:4px;margin-bottom:18px}
    .dm-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:#dc2626;animation:dm-pulse 1.5s infinite}
    @keyframes dm-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
    .dm-h1{font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-1.4px;color:#fff;margin:0 0 10px;line-height:1.1}
    .dm-h1 span{color:#d4af37;font-style:italic}
    .dm-sub{font-size:15px;color:#94a3b8;line-height:1.6;max-width:680px}

    .dm-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px}
    @media(max-width:920px){.dm-grid{grid-template-columns:1fr}}

    /* ── Step cards ── */
    .dm-step{padding:24px 26px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.22);border-left:3px solid #d4af37;border-radius:6px;display:flex;flex-direction:column;gap:10px}
    .dm-step-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .dm-step-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:1.6px;color:#d4af37;text-transform:uppercase}
    .dm-step-time{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#94a3b8;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);padding:3px 8px;border-radius:3px}
    .dm-step-h{font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin:0}
    .dm-script{font-size:14.5px;color:#d4d8e0;line-height:1.65;font-style:italic;padding:14px 16px;background:rgba(0,0,0,0.3);border-left:2px solid #2155cd;border-radius:3px;margin:6px 0 10px}
    .dm-script strong{color:#fff;font-style:normal;font-weight:700}
    .dm-action{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:6px}
    .dm-btn{background:#d4af37;color:#0a1128;border:none;border-radius:4px;padding:11px 18px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;font-weight:800;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s}
    .dm-btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(212,175,55,0.25);background:#e6c252}
    .dm-btn-meta{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;color:#94a3b8;letter-spacing:0.4px}

    .dm-cue{padding:8px 12px;background:rgba(33,85,205,0.1);border:1px solid rgba(33,85,205,0.3);border-radius:3px;font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:0.6px;color:#5b8eff;text-transform:uppercase}

    /* ── Pre-flight ── */
    .dm-preflight{margin-top:28px;padding:24px 28px;background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,55,0.22);border-radius:6px}
    .dm-preflight-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:1.4px;color:#d4af37;text-transform:uppercase;margin-bottom:14px}
    .dm-preflight-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
    @media(max-width:680px){.dm-preflight-list{grid-template-columns:1fr}}
    .dm-preflight-list li{font-size:13px;color:#d4d8e0;line-height:1.5;padding-left:24px;position:relative}
    .dm-preflight-list li::before{content:'☐';position:absolute;left:0;color:#d4af37;font-weight:800}

    /* ── Post-record ── */
    .dm-after{margin-top:28px;padding:24px 28px;background:linear-gradient(135deg,rgba(33,85,205,0.1),rgba(212,175,55,0.04));border:1px solid rgba(91,142,255,0.32);border-radius:6px}
    .dm-after-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:1.4px;color:#5b8eff;text-transform:uppercase;margin-bottom:10px}
    .dm-after-body{font-size:13.5px;color:#d4d8e0;line-height:1.7}
    .dm-after-body code{background:rgba(0,0,0,0.4);padding:2px 6px;border-radius:3px;color:#d4af37;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px}
  `;

  const openInNewTab = (path) => window.open(path, "_blank");

  return (
    <div className="dm-page">
      <style>{css}</style>
      <TopNav />
      <div className="dm-wrap">

        <div className="dm-head">
          <div className="dm-eyebrow"><span className="dm-eyebrow-dot" /> ▸ RECORDING MODE · NOT FOR PUBLIC SHARE</div>
          <h1 className="dm-h1">60-second Loom — <span>Calgary 24-unit demo.</span></h1>
          <p className="dm-sub">
            Hit record, read the script under each step, click the button to navigate.
            Each button opens in a <strong style={{color:"#d4af37"}}>new tab</strong> so this script stays available. Total runtime: ~60 seconds.
          </p>
        </div>

        {/* ── Pre-flight checklist ── */}
        <div className="dm-preflight">
          <div className="dm-preflight-h">▸ Pre-flight checklist (60 seconds)</div>
          <ul className="dm-preflight-list">
            <li>Loom desktop app installed (loom.com/desktop)</li>
            <li>Camera bubble OFF (cleaner — only voice + screen)</li>
            <li>Browser zoom at 100% · close all other tabs</li>
            <li>Notifications silenced (DnD on)</li>
            <li>This /demo tab open on second monitor (if you have one)</li>
            <li>Mic level checked · no background hum</li>
            <li>Test the script once silently before recording</li>
            <li>Hit record · open new tab · go to <code style={{background:"rgba(0,0,0,0.35)",padding:"1px 5px",borderRadius:3,color:"#d4af37",fontFamily:"'Geist Mono',ui-monospace,monospace"}}>www.realdealestate.app</code></li>
          </ul>
        </div>

        <div className="dm-grid" style={{marginTop:24}}>

          {/* ── STEP 1 — X-Ray ── */}
          <div className="dm-step">
            <div className="dm-step-head">
              <span className="dm-step-num">▸ STEP 01 · X-Ray bar</span>
              <span className="dm-step-time">0:00 → 0:15</span>
            </div>
            <h2 className="dm-step-h">"Type any Canadian address. 5 seconds."</h2>
            <div className="dm-script">
              <strong>SAY:</strong> "RizeAI is the AI underwriting layer for Canadian real
              estate. Watch — I type a Calgary address. Five seconds.
              Parcel-level zoning, year built, assessed value, plus an
              AI Building Grade across four institutional dimensions.
              That's a CoStar feature. Free here."
            </div>
            <div className="dm-cue">▸ CLICK the Calgary R-CG preset on the X-Ray bar</div>
            <div className="dm-action">
              <button className="dm-btn" onClick={() => openInNewTab("/")}>
                ▸ Open landing
              </button>
              <span className="dm-btn-meta">→ click "Calgary · R-CG" preset</span>
            </div>
          </div>

          {/* ── STEP 2 — Loss-to-Lease ── */}
          <div className="dm-step">
            <div className="dm-step-head">
              <span className="dm-step-num">▸ STEP 02 · The Moat (LTL)</span>
              <span className="dm-step-time">0:15 → 0:45</span>
            </div>
            <h2 className="dm-step-h">"Drag a rent roll. See the stranded upside."</h2>
            <div className="dm-script">
              <strong>SAY:</strong> "But that's not the moat. THIS is. Drop any broker
              rent roll PDF onto the Commercial Underwriter. AI OCRs every
              unit, cross-references CMHC market rent, and surfaces the stranded
              upside in dollars per door. 24-unit Calgary multifamily —
              <strong> $187,000 of stranded annual upside, $708 per door per month,
              38% below market, $460K five-year NPV.</strong> From a 47-page broker
              OM. In five seconds."
            </div>
            <div className="dm-cue">▸ CLICK below to open Commercial Underwriter pre-loaded with the sample deal</div>
            <div className="dm-action">
              <button className="dm-btn" onClick={() => openInNewTab("/commercial?demo=1")}>
                ▸ Open /commercial?demo=1
              </button>
              <span className="dm-btn-meta">→ scroll to the LTL panel · let the KPIs land</span>
            </div>
          </div>

          {/* ── STEP 3 — IC Memo ── */}
          <div className="dm-step">
            <div className="dm-step-head">
              <span className="dm-step-num">▸ STEP 03 · IC Memo PDF</span>
              <span className="dm-step-time">0:45 → 0:60</span>
            </div>
            <h2 className="dm-step-h">"One click. 2-page institutional PDF."</h2>
            <div className="dm-script">
              <strong>SAY:</strong> "And the deliverable. One click. Two-page
              institutional IC memo PDF — underwriting summary on page one,
              loss-to-lease on page two. Same package a junior analyst would
              spend three hours building. Live in production at
              www.realdealestate.app. <strong>If you're a Canadian broker, agent, or
              syndicator — book the link below. I'll run YOUR next rent roll
              through it on Zoom.</strong>"
            </div>
            <div className="dm-cue">▸ SCROLL DOWN on /commercial · hit "Save Memo" → PDF drops</div>
            <div className="dm-action">
              <button className="dm-btn" onClick={() => openInNewTab("/commercial?demo=1")}>
                ▸ Stay on /commercial
              </button>
              <span className="dm-btn-meta">→ click "Save Memo" button near bottom</span>
            </div>
          </div>

          {/* ── STEP 4 — CTA / outro ── */}
          <div className="dm-step" style={{borderLeftColor:"#5b8eff"}}>
            <div className="dm-step-head">
              <span className="dm-step-num" style={{color:"#5b8eff"}}>▸ STEP 04 · Outro</span>
              <span className="dm-step-time">already at 0:60</span>
            </div>
            <h2 className="dm-step-h">"Book the link below."</h2>
            <div className="dm-script">
              <strong>SAY:</strong> "RizeAI dot — sorry — realdealestate dot app. Free
              tier, no credit card. Brokers — Calendly link in the description.
              Talk soon."
            </div>
            <div className="dm-cue" style={{color:"#5b8eff",borderColor:"rgba(91,142,255,0.3)",background:"rgba(33,85,205,0.1)"}}>▸ STOP RECORDING</div>
            <div className="dm-action">
              <span className="dm-btn-meta">Total runtime target: 55-65 seconds</span>
            </div>
          </div>
        </div>

        {/* ── After recording ── */}
        <div className="dm-after">
          <div className="dm-after-h">▸ After you stop recording</div>
          <div className="dm-after-body">
            <ol style={{paddingLeft:20,margin:0,display:"flex",flexDirection:"column",gap:6}}>
              <li>Loom uploads automatically. Wait ~30 seconds for processing.</li>
              <li>Click the Loom video → <strong>Settings</strong> → <strong>Privacy</strong> → set to "Anyone with the link"</li>
              <li>Copy the public Loom URL (looks like <code>https://www.loom.com/share/abc123...</code>)</li>
              <li>Open <code>src/Brokers.jsx</code> in the repo. Search for <code>"loom.com"</code>. Replace the placeholder href with your Loom URL.</li>
              <li>Run <code>vercel --prod --yes</code> from the project directory. ~90s deploy.</li>
              <li>Done — Loom is now embedded on /brokers and ready to share via LinkedIn DMs.</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
}
