/**
 * X-Ray prefill store — keeps the last successful X-Ray scan in localStorage
 * so the user can flow from the landing X-Ray bar straight into any
 * calculator (Flip, BRRRR, Multifamily, Commercial) without re-typing.
 *
 * 30-minute TTL — old prefills are silently ignored so the user doesn't get
 * yesterday's address auto-filled tomorrow.
 *
 * Shape:
 *   {
 *     v: 1,                                // schema version
 *     ts: 1718230000000,                   // when the scan ran
 *     address: "2424 Westmount Rd NW…",    // verbatim input
 *     yearBuilt: 1968,
 *     assessedValue: 537500,
 *     zoning: { code, description, maxStoreys, maxUnits, maxHeightM },
 *     cmhc: { city, province, vacancyRate, avgRents, dataYear },
 *     rentEstimate: 1938,
 *     country: "CA",
 *     source: "calgary-open-data",
 *   }
 */

const KEY = "rde_xray_prefill_v1";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function saveXrayPrefill(data) {
  if (typeof window === "undefined") return;
  if (!data?.address) return;
  try {
    const payload = {
      v: 1,
      ts: Date.now(),
      address:        data.address,
      yearBuilt:      data.yearBuilt ?? null,
      assessedValue:  data.assessedValue ?? null,
      zoning:         data.zoning ?? null,
      cmhc:           data.cmhc ?? null,
      rentEstimate:   data.rentEstimate ?? null,
      country:        data.country ?? null,
      source:         data.source ?? null,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* quota / disabled — swallow */ }
}

export function getXrayPrefill() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== 1) return null;
    if (!data?.ts || Date.now() - data.ts > TTL_MS) {
      // Expired — clean it up.
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

export function clearXrayPrefill() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function formatAge(ts) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
