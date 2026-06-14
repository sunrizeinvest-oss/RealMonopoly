/**
 * Geocode an address → { lat, lng, city, province } and identify which city adapter to use.
 *
 * Uses the free Nominatim (OpenStreetMap) API. For higher accuracy/quota, swap to
 * Mapbox or Google later — same interface.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "rizeai.co/1.0 (sunni@rizeai.co)";

// Map normalized city slugs to our adapter file names
export const CITY_ADAPTERS = {
  edmonton: "edmonton",
  calgary: "calgary",
  vancouver: "vancouver",
  toronto: "toronto",
  ottawa: "ottawa",
  mississauga: "mississauga",
};

export async function geocode(address) {
  const url = `${NOMINATIM}?q=${encodeURIComponent(address)}&format=json&addressdetails=1&countrycodes=ca&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`geocode failed: ${res.status}`);
  const results = await res.json();
  if (!results.length) throw new Error(`no geocode result for "${address}"`);
  const r = results[0];
  const addr = r.address || {};
  const cityRaw = (addr.city || addr.town || addr.municipality || addr.county || "").toLowerCase();
  const province = (addr.state || "").toLowerCase();
  // Edmonton metro includes Sherwood Park, St. Albert, Spruce Grove — keep them on Edmonton adapter
  // Calgary metro: Airdrie, Cochrane, Okotoks → Calgary adapter
  // Vancouver metro: Burnaby, Richmond, Surrey, NorthVan → Vancouver adapter
  // Toronto metro (GTA): Mississauga, Brampton, Markham, Vaughan, Pickering → Toronto adapter
  let citySlug = null;
  if (cityRaw.includes("edmonton") || /sherwood park|st. albert|spruce grove|fort saskatchewan|leduc/.test(cityRaw)) {
    citySlug = "edmonton";
  } else if (cityRaw.includes("calgary") || /airdrie|cochrane|okotoks|chestermere/.test(cityRaw)) {
    citySlug = "calgary";
  } else if (cityRaw.includes("vancouver") || /burnaby|richmond|surrey|north vancouver|west vancouver|coquitlam|new westminster|delta/.test(cityRaw)) {
    citySlug = "vancouver";
  } else if (cityRaw.includes("mississauga") || /port credit|streetsville|cooksville|clarkson|meadowvale|erin mills/.test(cityRaw)) {
    // Mississauga has its own zoning bylaw 0225-2007 with parcel-level data.
    // Keep this branch BEFORE the Toronto GTA catch-all so Mississauga
    // addresses hit the Mississauga adapter, not Toronto's.
    citySlug = "mississauga";
  } else if (cityRaw.includes("toronto") || /brampton|markham|vaughan|pickering|ajax|oakville|burlington|richmond hill|north york|scarborough|etobicoke/.test(cityRaw)) {
    citySlug = "toronto";
  } else if (cityRaw.includes("ottawa") || /gatineau|kanata|orléans|orleans|nepean|barrhaven|stittsville|gloucester|cumberland|rockcliffe park|vanier/.test(cityRaw)) {
    // Ottawa-Gatineau CMA. Gatineau is QC but historically operates as part
    // of the same metro; routing it to the Ottawa adapter gives users a
    // zoning lookup even when the geocoder lands on the Gatineau side.
    citySlug = "ottawa";
  }
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    city: cityRaw,
    province,
    citySlug,           // null if we don't support this city yet
    displayName: r.display_name,
    raw: addr,
  };
}

export function isSupported(citySlug) {
  return citySlug && CITY_ADAPTERS[citySlug];
}
