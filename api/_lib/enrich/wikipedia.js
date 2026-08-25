/**
 * Wikipedia neighborhood enricher.
 *
 * Given a neighborhood name (from city assessment data) and a city, fetches
 * the Wikipedia page summary + selected infobox facts. Public REST API,
 * no key required, ~200ms typical latency.
 *
 * Safe by design: any failure returns null; the caller wraps the call in
 * Promise.allSettled so a slow or missing page never blocks the response.
 */

const UA = "FlipAnalyzer/1.0 (https://rizedevelopments.com; sunni@rizedevelopments.com)";

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { "accept": "application/json", "user-agent": UA } });
  if (!r.ok) return null;
  return await r.json();
}

function normalizeTitle(name, city) {
  const clean = name.trim().replace(/\s+/g, "_");
  // Most Edmonton neighborhood pages follow "Neighborhood,_Edmonton" format
  return `${clean},_${city}`;
}

async function fetchSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const data = await fetchJSON(url);
  if (!data || data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;
  // Wikipedia will return a disambiguation page for names like "Inglewood"; skip those.
  if (data.type === "disambiguation") return null;
  return data;
}

/**
 * getNeighborhoodProfile
 * @param {string} neighborhood — raw name from city assessment (e.g. "CAPILANO")
 * @param {string} city — capitalized ("Edmonton", "Calgary", "Toronto", "Vancouver")
 * @returns {Promise<null | { title, extract, url, thumbnail, wikidata }>}
 *
 * Tries in order (first hit wins):
 *   1. "Neighborhood, City" — most Canadian community pages use this form.
 *   2. "Neighborhood" alone — for well-known districts (Kitsilano, Gastown,
 *      Distillery District) that don't need the city suffix.
 * Skips disambiguation pages so we don't render a "could mean X, Y, or Z" stub.
 */
export async function getNeighborhoodProfile(neighborhood, city = "Edmonton") {
  if (!neighborhood) return null;
  // Neighborhood names in city datasets are ALLCAPS ("CAPILANO"). Wikipedia
  // pages are Title Case ("Capilano, Edmonton"). Normalize.
  const titled = neighborhood.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const attempts = [
    { title: normalizeTitle(titled, city), strict: false },  // "Capilano,_Edmonton" — trust it, city is in the title
    { title: titled.replace(/\s+/g, "_"),  strict: true },   // "Kitsilano" — must mention city or province to accept
  ];

  const provinceHints = {
    Edmonton: /alberta/i,   Calgary:   /alberta/i,
    Toronto:  /ontario/i,   Ottawa:    /ontario/i,   Mississauga: /ontario/i,
    Hamilton: /ontario/i,   Vancouver: /british columbia|b\.?c\.?/i,
  };
  const cityRegex = new RegExp(city, "i");
  const provRegex = provinceHints[city] || null;

  let data = null;
  for (const { title, strict } of attempts) {
    const d = await fetchSummary(title);
    if (!d) continue;
    if (strict) {
      // Plain-name lookup — accept only if the summary is clearly about the
      // right place, not a common-noun disambig. Look for city name OR the
      // province in the extract.
      const extract = d.extract || "";
      if (!cityRegex.test(extract) && !(provRegex && provRegex.test(extract))) continue;
    }
    data = d;
    break;
  }
  if (!data) return null;

  return {
    title: data.title || null,
    extract: data.extract || null,
    url: data.content_urls?.desktop?.page || null,
    thumbnail: data.thumbnail?.source || null,
    wikidata: data.wikibase_item || null,
    coordinates: data.coordinates ? { lat: data.coordinates.lat, lng: data.coordinates.lon } : null,
    source: "wikipedia",
  };
}
