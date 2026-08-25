/**
 * Google Street View enricher.
 *
 * Given lat/lng, checks the Street View Metadata API to confirm imagery
 * exists at (or near) the point. If yes, returns two Static Street View
 * URLs — a card-sized image and a hero-sized image — plus the imagery date.
 *
 * Key SHOULD be restricted to HTTP referrers (*.vercel.app + your prod domain)
 * in Google Cloud Console → Credentials → your key → Application restrictions.
 * The static image URL includes the key in plaintext but the referrer restriction
 * makes it useless outside your domain.
 *
 * Fail-open: any missing key / no coverage / API error returns null so the
 * caller wraps in Promise.allSettled and never blocks the response.
 */

const STATIC_BASE   = "https://maps.googleapis.com/maps/api/streetview";
const METADATA_BASE = "https://maps.googleapis.com/maps/api/streetview/metadata";

// Radius to search for Street View panoramas. Google will snap to the nearest
// panorama within this distance. 100m covers most residential streets even
// when the coordinate is a rooftop pin off the actual road.
const SEARCH_RADIUS_M = 100;

/**
 * getStreetView
 * @param {{lat: number, lng: number}} loc
 * @returns {Promise<null | {
 *   available: boolean,
 *   panoDate: string | null,       // "YYYY-MM" from Google metadata
 *   cardUrl: string,                // 800x400 for the property card
 *   heroUrl: string,                // 1600x600 for a larger display
 *   panoLat: number, panoLng: number,
 * }>}
 */
export async function getStreetView({ lat, lng }) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const metaUrl = `${METADATA_BASE}?location=${lat},${lng}&radius=${SEARCH_RADIUS_M}&key=${apiKey}`;

  let meta;
  try {
    const r = await fetch(metaUrl);
    if (!r.ok) return null;
    meta = await r.json();
  } catch {
    return null;
  }

  // Google returns status codes: OK / ZERO_RESULTS / NOT_FOUND / OVER_QUERY_LIMIT / REQUEST_DENIED
  if (meta.status !== "OK") return null;

  const params = (size) => new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    fov: "80",       // slightly wide-angle — property + neighbouring context
    heading: "",     // let Google pick the best-facing shot
    pitch: "0",
    radius: String(SEARCH_RADIUS_M),
    key: apiKey,
  }).toString();

  return {
    available: true,
    panoDate: meta.date || null,
    panoLat:  meta.location?.lat ?? null,
    panoLng:  meta.location?.lng ?? null,
    cardUrl:  `${STATIC_BASE}?${params("800x400")}`,
    heroUrl:  `${STATIC_BASE}?${params("1600x600")}`,
    source: "google-street-view",
  };
}
