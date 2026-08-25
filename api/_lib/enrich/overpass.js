/**
 * OpenStreetMap Overpass API enricher — nearby amenities within radius.
 *
 * Returns counts + closest examples of the amenities that most affect
 * residential property value:
 *   - Schools (any level)
 *   - Transit stops (bus, LRT, subway)
 *   - Grocery stores / supermarkets
 *   - Restaurants + cafés (retail density signal)
 *   - Parks / green space
 *
 * Free API, no key. ~500ms typical latency; Overpass can be slow under load
 * so we cap the query with a short timeout and fail-open on any error.
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const QUERY_TIMEOUT_S = 15;   // Overpass server-side timeout
const FETCH_TIMEOUT_MS = 12000;

// Distance in meters. Different radii tuned to what people actually walk to.
const R_SCHOOL     = 1200;
const R_TRANSIT    = 500;
const R_GROCERY    = 800;
const R_RESTAURANT = 500;
const R_PARK       = 800;

// Haversine distance in meters between two lat/lng points.
function distMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function nameFor(tags) {
  return tags?.name || tags?.["name:en"] || tags?.brand || tags?.operator || null;
}

/**
 * getNearbyAmenities
 * @param {{lat: number, lng: number}} loc
 * @returns {Promise<null | {
 *   schools:     { count, nearest: [{name, distance}] },
 *   transit:     { count, nearest: [{name, distance, type}] },
 *   grocery:     { count, nearest: [{name, distance}] },
 *   restaurants: { count, nearest: [{name, distance}] },
 *   parks:       { count, nearest: [{name, distance}] }
 * }>}
 */
export async function getNearbyAmenities({ lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  // One combined Overpass query — cheaper than 5 separate fetches, single
  // roundtrip pays for itself even though radii vary.
  const query = `
    [out:json][timeout:${QUERY_TIMEOUT_S}];
    (
      node["amenity"~"^(school|kindergarten|college|university)$"](around:${R_SCHOOL},${lat},${lng});
      way["amenity"~"^(school|kindergarten|college|university)$"](around:${R_SCHOOL},${lat},${lng});
      node["public_transport"="stop_position"](around:${R_TRANSIT},${lat},${lng});
      node["highway"="bus_stop"](around:${R_TRANSIT},${lat},${lng});
      node["railway"~"^(station|halt|tram_stop)$"](around:${R_TRANSIT},${lat},${lng});
      node["shop"~"^(supermarket|convenience)$"](around:${R_GROCERY},${lat},${lng});
      way["shop"~"^(supermarket|convenience)$"](around:${R_GROCERY},${lat},${lng});
      node["amenity"~"^(restaurant|cafe|fast_food)$"](around:${R_RESTAURANT},${lat},${lng});
      node["leisure"~"^(park|playground|garden)$"](around:${R_PARK},${lat},${lng});
      way["leisure"~"^(park|playground|garden)$"](around:${R_PARK},${lat},${lng});
    );
    out center 60;
  `.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let data;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "FlipAnalyzer/1.0 (sunni@rizedevelopments.com)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!data?.elements?.length) return null;

  // Bucket every element by category based on its tags.
  const buckets = { schools: [], transit: [], grocery: [], restaurants: [], parks: [] };

  for (const el of data.elements) {
    const t = el.tags || {};
    // Way elements report their centroid in "center"; nodes have lat/lng directly.
    const eLat = el.lat ?? el.center?.lat;
    const eLng = el.lon ?? el.center?.lon;
    if (eLat == null || eLng == null) continue;
    const d = distMeters(lat, lng, eLat, eLng);
    const name = nameFor(t);
    const entry = { name, distance: d, tags: t };

    if (/^(school|kindergarten|college|university)$/.test(t.amenity)) buckets.schools.push(entry);
    else if (t.public_transport === "stop_position" || t.highway === "bus_stop" || /^(station|halt|tram_stop)$/.test(t.railway)) {
      let type = "bus";
      if (t.railway === "station" || t.railway === "halt") type = "train";
      else if (t.railway === "tram_stop") type = "tram";
      buckets.transit.push({ ...entry, type });
    }
    else if (/^(supermarket|convenience)$/.test(t.shop)) buckets.grocery.push(entry);
    else if (/^(restaurant|cafe|fast_food)$/.test(t.amenity)) buckets.restaurants.push(entry);
    else if (/^(park|playground|garden)$/.test(t.leisure)) buckets.parks.push(entry);
  }

  // Sort each by distance and keep the 3 closest with names (unnamed entries
  // still count toward totals but are noisy in the "nearest" list).
  const summarize = (arr, keepUnnamedInCount = true) => {
    const named = arr.filter(e => e.name).sort((a, b) => a.distance - b.distance);
    return {
      count: keepUnnamedInCount ? arr.length : named.length,
      nearest: named.slice(0, 3).map(({ name, distance, type }) => (type ? { name, distance, type } : { name, distance })),
    };
  };

  return {
    schools:     summarize(buckets.schools),
    transit:     summarize(buckets.transit),
    grocery:     summarize(buckets.grocery),
    restaurants: summarize(buckets.restaurants),
    parks:       summarize(buckets.parks),
    source: "openstreetmap",
  };
}
