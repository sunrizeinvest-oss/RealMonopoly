/**
 * BuddyLoading — the shared "▸ label…" loading indicator used across every
 * Buddy surface. Replaces 5 different treatments (mono text, bouncing dots,
 * shimmer bars) with one primitive so a loading state looks the same
 * everywhere the user sees it.
 *
 *   <BuddyLoading label="looking up public records" />
 *   <BuddyLoading label="asking Buddy" tone="royal" />
 *   <BuddyLoading label="Grading building" size="sm" />
 *
 * Props:
 *   label — required, no trailing ellipsis (the component adds one)
 *   tone  — 'brass' (default) · 'royal' · 'green' · 'sub' (muted)
 *   size  — 'sm' (10px) · 'md' (11.5px, default) · 'lg' (13px)
 *   inline — set true when embedding in a flex row of other elements
 */

const TONE_COLORS = {
  brass:  "var(--brass,#d4af37)",
  royal:  "var(--royal,#2155cd)",
  green:  "var(--green,#16a34a)",
  sub:    "var(--sub,#475569)",
};

const SIZES = {
  sm: 10,
  md: 11.5,
  lg: 13,
};

export default function BuddyLoading({ label, tone = "sub", size = "md", inline = false }) {
  const color = TONE_COLORS[tone] || TONE_COLORS.sub;
  const fontSize = SIZES[size] || SIZES.md;
  return (
    <span style={{
      display: inline ? "inline-flex" : "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "'Geist Mono',ui-monospace,monospace",
      fontSize,
      fontWeight: 600,
      color,
      letterSpacing: 0.3,
      animation: "buddy-pulse 1.4s ease-in-out infinite",
    }}>
      <style>{`
        @keyframes buddy-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>
      <span aria-hidden="true">▸</span>
      <span>{label}…</span>
    </span>
  );
}
