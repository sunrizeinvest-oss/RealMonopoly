/**
 * raiseConfig.js — single source of truth for the raise numbers.
 *
 * Every raise-facing surface (progress bar on /pitch, backer wall, timeline)
 * reads from here. Update the fields as the raise progresses — the site
 * refreshes on the next visit.
 *
 * When the raise closes, either delete this file or set `CLOSED: true` to
 * hide the progress signals.
 */

export const RAISE = {
  // The target size of the round in USD.
  targetUSD: 1_500_000,

  // Committed capital. Update each time a signed commit lands.
  committedUSD: 0, // TODO: update as commits come in

  // Instrument used for the raise.
  instrument: "YC SAFE (post-money)",

  // Round type shown as a chip.
  roundType: "Pre-Seed",

  // Currency label displayed to investors. USD is standard even for CA cos.
  currency: "USD",

  // Dates in ISO format (YYYY-MM-DD). Timezone-naive is fine — they're
  // display-only.
  firstCloseTarget: "2026-08-15",  // aggressive first-close target
  finalCloseTarget: "2026-10-31",  // hard final-close date
  raiseStarted: "2026-07-01",      // when the raise officially opened

  // Set to true after the round closes — hides all progress signals + shows
  // a "raise closed" message across surfaces.
  CLOSED: false,

  // Backers who have committed AND opted in to being named publicly. Add
  // one row per committed check. Amount is optional (some prefer "undisclosed").
  //
  //   { name: "Anita Sharma", firm: "Version One Ventures", amount: 100000, url: "https://…" }
  //
  // Leave `amount: null` for undisclosed. Leave `url: null` for no link.
  // The wall renders cards in the order listed here.
  backers: [
    // {
    //   name: "Example Angel",
    //   firm: "Example Fund",
    //   amount: 25000,
    //   url: "https://example.com",
    //   quote: "Optional 1-sentence testimonial",
    // },
  ],

  // Milestone gates — what each dollar tranche unlocks. Rendered on the
  // timeline page. Amounts should be cumulative (raise-to-date, not deltas).
  milestones: [
    { at: 250_000,   label: "Second engineer hired",     desc: "Ships US expansion adapters + BuildFax integration" },
    { at: 500_000,   label: "GTM Lead onboarded",        desc: "Scales broker outreach beyond founder time" },
    { at: 750_000,   label: "First close",               desc: "Warm intros to Series-A funds begin" },
    { at: 1_000_000, label: "CS Lead + first PR push",   desc: "Retention + upmarket motion + press moment" },
    { at: 1_500_000, label: "Round closes at target",    desc: "Runway to $100K MRR / 1,000 paying customers" },
  ],
};

export function raisePercent() {
  if (!RAISE.targetUSD) return 0;
  return Math.min(100, Math.round((RAISE.committedUSD / RAISE.targetUSD) * 100));
}

export function formatUSD(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 1 : 2).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export function daysUntil(iso) {
  try {
    const target = new Date(iso).getTime();
    const now = new Date().getTime();
    const days = Math.round((target - now) / 86400000);
    return days;
  } catch { return null; }
}

/**
 * Format an ISO date string ("2026-08-15") as human-readable
 * ("August 15, 2026" or "Aug 15, 2026" if short=true).
 * The dates in raiseConfig.js are stored as ISO for sortability,
 * but rendered as prose everywhere on the site.
 */
export function formatDate(iso, short = false) {
  try {
    // Force local-timezone-agnostic parse (append T00:00:00 to sidestep TZ shift)
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: short ? "short" : "long",
      day: "numeric",
    });
  } catch { return iso; }
}
