/**
 * Edmonton city adapter — VALIDATED dataset IDs (verified live against demo).
 *
 *   - fixa-tstc → Zoning Bylaw Geographical Data (polygon dataset)
 *   - q7d6-ambg → Property Assessment Data (Current Calendar Year)
 *   - 24uj-dj8v → Building Permits
 */

const SOCRATA_BASE = "https://data.edmonton.ca/resource";
const APP_TOKEN = process.env.EDMONTON_APP_TOKEN;

const DS_ZONING = "fixa-tstc";
const DS_ASSESSMENT = "q7d6-ambg";
const DS_PERMITS = "24uj-dj8v";

function url(dataset, params) {
  const u = new URL(`${SOCRATA_BASE}/${dataset}.json`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  if (APP_TOKEN) u.searchParams.set("$$app_token", APP_TOKEN);
  return u.toString();
}

/**
 * Zoning is a polygon dataset — use intersects() with a POINT.
 */
export async function getZoning({ lat, lng, address }) {
  const u = url(DS_ZONING, {
    $where: `intersects(geometry_multipolygon, 'POINT(${lng} ${lat})')`,
    $limit: 1,
  });
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Edmonton zoning fetch failed: ${res.status}`);
  const rows = await res.json();
  if (!rows.length) return { city: "edmonton", found: false, address };
  return normalize(rows[0], address);
}

/**
 * Assessment lookup by address (more reliable than coord-based — latitude is
 * stored as string in Socrata and numeric comparisons return blank rows).
 */
// Edmonton's open-data assessment dataset stores street types fully expanded
// ("101 STREET NW", not "101 ST NW"). The geocoder hands us the abbreviated
// form, so we expand every common suffix — anywhere in the token sequence,
// not just trailing — before querying.
const STREET_SUFFIX = {
  ST: "STREET", AVE: "AVENUE", RD: "ROAD", DR: "DRIVE",
  BLVD: "BOULEVARD", PL: "PLACE", CRES: "CRESCENT", CR: "CRESCENT",
  CT: "COURT", LN: "LANE", WY: "WAY", PKY: "PARKWAY", PKWY: "PARKWAY",
  TER: "TERRACE", TRL: "TRAIL", TR: "TRAIL", HWY: "HIGHWAY", CIR: "CIRCLE",
  GDNS: "GARDENS", GRN: "GREEN", HTS: "HEIGHTS", LNDG: "LANDING",
  MNR: "MANOR", PT: "POINT", PTE: "POINTE", VW: "VIEW", VLG: "VILLAGE",
};
const DIRECTIONAL = new Set(["N", "S", "E", "W", "NW", "NE", "SW", "SE"]);

function expandEdmontonStreet(streetRaw) {
  const tokens = streetRaw.trim().toUpperCase().split(/\s+/);
  return tokens.map(t => STREET_SUFFIX[t] || t).join(" ");
}

export async function getAssessment({ address }) {
  if (!address) return null;
  const m = /^\s*(\d+)\s+(.+?)(?:,|$)/.exec(address.toUpperCase());
  if (!m) return null;
  const house = m[1];
  const streetExpanded = expandEdmontonStreet(m[2]);

  // Try the full expanded street first.
  const tryQuery = async (street) => {
    const u = url(DS_ASSESSMENT, {
      $where: `house_number='${house}' AND street_name='${street.replace(/'/g, "''")}'`,
      $limit: 1,
    });
    const res = await fetch(u);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0] : null;
  };

  let r = await tryQuery(streetExpanded);

  // Fallback: drop a trailing directional (rare alignment mismatch between
  // geocoder and dataset, e.g. "101 STREET" vs "101 STREET NW").
  if (!r) {
    const tokens = streetExpanded.split(/\s+/);
    if (DIRECTIONAL.has(tokens[tokens.length - 1])) {
      r = await tryQuery(tokens.slice(0, -1).join(" "));
    }
  }

  if (!r) return null;
  return {
    assessedValue: parseFloat(r.assessed_value) || null,
    assessmentYear: r.assessment_year || null,
    yearBuilt: null, // Edmonton's open-data assessment doesn't publish year built
    taxClass: r.tax_class || null,
    houseNumber: r.house_number || null,
    streetName: r.street_name || null,
    neighbourhood: r.neighbourhood || null,
    ward: r.ward || null,
    garage: r.garage || null,
    millClass: r.mill_class_1 || null,
    raw: r,
  };
}

/**
 * Permits within ~1km, last 2 years.
 * latitude/longitude are strings in Socrata so we use a bounding box.
 */
export async function getPermits({ lat, lng, radiusMeters = 1000 }) {
  const dlat = radiusMeters / 111000;
  const dlng = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
  const u = url(DS_PERMITS, {
    $where: `latitude > ${lat - dlat} AND latitude < ${lat + dlat} AND longitude > ${lng - dlng} AND longitude < ${lng + dlng}`,
    $limit: 20,
    $order: "permit_date DESC",
  });
  const res = await fetch(u);
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Translate Edmonton zoning row → normalized shape.
 */
function normalize(r, address) {
  const zone = r.zoning || "";
  const info = ZONE_INFO[zone] || {};
  return {
    city: "edmonton",
    found: true,
    address,
    zone,
    zoneDescription: r.description || info.description || null,
    permittedUses: [],
    maxHeightM: info.maxHeightM || null,
    maxStoreys: info.maxStoreys || null,
    maxFAR: info.maxFAR || null,
    maxUnits: info.maxUnits || null,
    minLotAreaM2: info.minLotAreaM2 || null,
    setbacks: { frontM: null, rearM: null, sideM: null },
    bylawUrl: r.url || null,
    raw: r,
  };
}

// Edmonton Zoning Bylaw 20001 — quick reference for common zones
const ZONE_INFO = {
  "RS":  { description: "Small Scale Residential", maxHeightM: 10, maxStoreys: 2.5, maxFAR: 0.7, maxUnits: 4, minLotAreaM2: 250 },
  "RSF": { description: "Small Scale Flex Residential", maxHeightM: 10, maxStoreys: 2.5, maxFAR: 0.7, maxUnits: 4, minLotAreaM2: 250 },
  "RSM": { description: "Small-Medium Scale Residential", maxHeightM: 12, maxStoreys: 3, maxFAR: 1.0, maxUnits: 8, minLotAreaM2: 280 },
  "RM":  { description: "Medium Scale Residential", maxHeightM: 16, maxStoreys: 4, maxFAR: 1.3, maxUnits: 16, minLotAreaM2: 360 },
  "RL":  { description: "Large Scale Residential", maxHeightM: 23, maxStoreys: 6, maxFAR: 2.0, maxUnits: null, minLotAreaM2: 600 },
  "MU":  { description: "Mixed Use", maxHeightM: 23, maxStoreys: 6, maxFAR: 2.5, maxUnits: null, minLotAreaM2: 360 },
  "CB":  { description: "Commercial Boulevard", maxHeightM: 16, maxStoreys: 4, maxFAR: 2.0, maxUnits: null, minLotAreaM2: null },
  "CG":  { description: "Commercial General", maxHeightM: 12, maxStoreys: 3, maxFAR: 1.5, maxUnits: null, minLotAreaM2: null },
  "BE":  { description: "Business Employment", maxHeightM: 12, maxStoreys: 3, maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "PS":  { description: "Public Services" },
};
