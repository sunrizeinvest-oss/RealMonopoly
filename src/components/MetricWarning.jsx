/**
 * MetricWarning — inline mini-banner that appears next to / under a metric
 * value WHEN it's outside the benchmark. Silent when the metric is fine.
 *
 * Built on top of the `coachingNote()` helper so the warning text is the
 * same plain-English coaching the DealReadout panel uses — but here it
 * appears at the metric itself, so the user catches the issue as they
 * adjust inputs (not just after they scroll down).
 *
 * Usage:
 *   <MetricWarning metric="dscr" value={calc.dscr} />
 *   <MetricWarning metric="capRate" value={calc.entryCap} ctx={{ citySlug: "calgary", propertyType: "multifamily" }} />
 *   <MetricWarning metric="flipMargin" value={calc.profitMargin} ctx={{ citySlug: "toronto" }} />
 *
 * Tones:
 *   warn    → red mini-banner (deal-breaker)
 *   caution → amber mini-banner (something to watch)
 *   ok/great→ renders nothing (no clutter when things are fine)
 */

import { coachingNote } from "../lib/benchmarks";

const TONE = {
  warn:    { bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.35)",  text: "#dc2626", glyph: "✗" },
  caution: { bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.40)", text: "#b8941f", glyph: "▲" },
};

export default function MetricWarning({ metric, value, ctx = {}, compact = false }) {
  if (value == null || !isFinite(value)) return null;
  const note = coachingNote(metric, value, ctx);
  if (!note) return null;
  if (note.tone !== "warn" && note.tone !== "caution") return null;

  const t = TONE[note.tone];

  return (
    <div style={{
      marginTop: compact ? 4 : 6,
      padding: compact ? "4px 8px" : "6px 10px",
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderLeft: `2px solid ${t.text}`,
      borderRadius: 3,
      fontSize: compact ? 10.5 : 11.5,
      lineHeight: 1.45,
      color: t.text,
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      fontFamily: "'Geist',sans-serif",
    }}>
      <span style={{
        fontWeight: 800,
        flexShrink: 0,
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: compact ? 10 : 11,
        lineHeight: 1.4,
      }}>{t.glyph}</span>
      <span>{note.text}</span>
    </div>
  );
}
