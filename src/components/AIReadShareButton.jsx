import { useState } from "react"
import { encodeReadForShare } from "../lib/aiReadCache"

/**
 * AIReadShareButton — tiny "⎘ SHARE" affordance that lives next to every
 * "▸ AI READ" label across the app. Copies a public /share/read/<payload>
 * URL to the clipboard, flashes "✓ COPIED" for 1.5s.
 *
 * Props mirror the shape stored in the AI Read cache history so the
 * shared payload renders identically to a Recent Reads item.
 *
 *   <AIReadShareButton
 *     scope="property"
 *     label={property.address}
 *     thesis={propertyThesis.thesis}
 *     source={propertyThesis.source}
 *   />
 *
 * savedAt defaults to "now" when not provided — fine for the in-app
 * surfaces since the shared payload is the user's current view.
 */
export default function AIReadShareButton({ scope, label, thesis, source, savedAt }) {
  const [copied, setCopied] = useState(false)

  if (!thesis) return null

  async function copy(e) {
    e.preventDefault()
    e.stopPropagation()
    const payload = encodeReadForShare({
      scope,
      label,
      thesis,
      source,
      savedAt: savedAt || Date.now(),
    })
    if (!payload) return
    const url = `${window.location.origin}/share/read/${payload}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard not available */ }
  }

  return (
    <button
      onClick={copy}
      title="Copy a shareable link to this AI Read"
      style={{
        marginLeft: 8,
        background: "transparent",
        color: copied ? "var(--green)" : "var(--dim)",
        border: `1px solid ${copied ? "rgba(22,163,74,0.4)" : "var(--borderf)"}`,
        borderRadius: 3,
        padding: "2px 7px",
        fontFamily: "'Geist Mono',monospace", fontSize: 8.5, fontWeight: 700,
        letterSpacing: "0.7px", cursor: "pointer", whiteSpace: "nowrap",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {copied ? "✓ COPIED" : "⎘ SHARE"}
    </button>
  )
}
