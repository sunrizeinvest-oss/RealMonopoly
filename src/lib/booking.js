/**
 * booking.js — meeting-booking config.
 *
 * Update `MEETING_URL` once when you set up Cal.com / Calendly. Every
 * "Book a meeting" CTA in the app reads from here, so replacing the string
 * changes every raise-flow CTA on the site at once.
 *
 * Zero-friction meeting booking beats mailto: by ~30% on VC conversion —
 * they'd rather grab a slot than compose an intro email.
 */

// Uses Sunni's real Rize Developments booking widget. Users landing here
// hit Sunni's actual calendar — same one qualified developers use to book
// project consultations. Feels institutional (same infrastructure as the
// existing real estate operator business).
export const MEETING_URL = "https://app.rizedevelopments.com/widget/bookings/sunni-yaremchuck";

// Fallback shown when MEETING_URL isn't set. Uses mailto: as safe default.
export const FALLBACK_MAILTO = "mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Meeting%20Request";

export function bookingHref() {
  if (MEETING_URL && MEETING_URL.startsWith("http")) return MEETING_URL;
  return FALLBACK_MAILTO;
}

// Optional label override (per-page can pass its own).
export const BOOKING_LABEL = "Book a 20-min intro →";
