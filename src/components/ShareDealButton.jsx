import { useState } from "react";
import { buildShareUrl, adaptBRRRR, adaptMultifamily } from "../lib/shareDeal";

/**
 * ShareDealButton — generates a /deal/b64:<...> URL from a saved deal
 * and copies it to the clipboard. The receiving page (SharedDeal.jsx)
 * decodes the payload — no backend needed.
 *
 * Props:
 *   deal: { id, type, name, address, savedAt, inputs, results, verdict }
 *   strategy: "brrrr" | "multifamily"   — picks the right adapter
 *   compact?: boolean                    — render as icon-only button
 */
export default function ShareDealButton({ deal, strategy = "brrrr", compact = false }) {
  const [state, setState] = useState("idle");  // "idle" | "copied" | "error"

  async function copyLink() {
    try {
      const adapter = strategy === "multifamily" ? adaptMultifamily : adaptBRRRR;
      const payload = adapter(deal);
      const url = buildShareUrl(payload);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (older browsers / http)
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setState("copied");
      setTimeout(() => setState("idle"), 1800);
    } catch (e) {
      console.error("[share] copy failed:", e);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const label =
    state === "copied" ? "✓ LINK COPIED" :
    state === "error"  ? "✕ COPY FAILED" :
    compact            ? "🔗" :
                         "🔗 SHARE LINK";

  const color =
    state === "copied" ? "var(--green)" :
    state === "error"  ? "var(--red)"   :
                         "var(--blue)";

  return (
    <button
      onClick={copyLink}
      disabled={!deal}
      title="Copy a shareable URL — anyone with the link can view the deal"
      style={{
        background: state === "copied" ? "rgba(52,217,138,0.08)" : "rgba(59,158,255,0.05)",
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: compact ? "8px 12px" : "10px 16px",
        color,
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: compact ? 13 : 11.5,
        fontWeight: 700,
        letterSpacing: "1.2px",
        cursor: deal ? "pointer" : "not-allowed",
        transition: "transform 0.15s, background 0.15s, border-color 0.15s",
        opacity: deal ? 1 : 0.5,
      }}
      onMouseEnter={e => { if (deal && state === "idle") { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "rgba(59,158,255,0.1)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; if (state === "idle") e.currentTarget.style.background = "rgba(59,158,255,0.05)"; }}
    >
      {label}
    </button>
  );
}
