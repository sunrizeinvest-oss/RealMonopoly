/**
 * Calgary city adapter — zoning + assessment via City of Calgary Open Data (Socrata).
 *
 * Same shape as Edmonton adapter. Free public API.
 * Set CALGARY_APP_TOKEN env var for higher quotas.
 *
 * Datasets:
 *   - Land Use Districts (zoning): qe6k-p9nh
 *   - Property Assessments: 4bsw-nn7w
 *   - Development Permits: 6933-unw5
 */

const SOCRATA_BASE = "https://data.calgary.ca/resource";
const APP_TOKEN = process.env.CALGARY_APP_TOKEN;

const DS_ZONING = "qe6k-p9nh";        // Land Use Districts
const DS_ASSESSMENT = "4bsw-nn7w";    // Property Assessments
const DS_PERMITS = "6933-unw5";       // Development Permits

function url(dataset, query) {
  const u = new URL(`${SOCRATA_BASE}/${dataset}.json`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  if (APP_TOKEN) u.searchParams.set("$$app_token", APP_TOKEN);
  return u.toString();
}

export async function getZoning({ lat, lng, address }) {
  // Polygon dataset — the geometry column `multipolygon` is a Polygon, so
  // within_circle (which expects a Point column) silently returns nothing.
  // Use intersects() with the query point — same pattern as Edmonton.
  const u = url(DS_ZONING, {
    $where: `intersects(multipolygon, 'POINT(${lng} ${lat})')`,
    $limit: 1,
  });
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Calgary zoning fetch failed: ${res.status}`);
  const rows = await res.json();
  if (!rows.length) return { city: "calgary", found: false, address };
  return normalize(rows[0], address);
}

export async function getAssessment({ lat, lng, address }) {
  // The geocoder returns street-line coords, so an exact intersects() against
  // the parcel polygon usually misses by 20-40m. Try intersects() first (cheap,
  // and authoritative when the geocode lands on the parcel), then fall back to
  // the nearest parcel within 50m. 50m keeps us inside the same lot — never
  // jumping the street to an unrelated neighbour.
  const exactUrl = url(DS_ASSESSMENT, {
    $where: `intersects(multipolygon, 'POINT(${lng} ${lat})')`,
    $limit: 1,
  });
  const exactRes = await fetch(exactUrl);
  if (!exactRes.ok) return null;
  let rows = await exactRes.json();

  if (!rows.length) {
    const nearestUrl = url(DS_ASSESSMENT, {
      $select: `*, distance_in_meters(multipolygon, 'POINT(${lng} ${lat})') as _dist`,
      $order: "_dist ASC",
      $limit: 1,
    });
    const nearRes = await fetch(nearestUrl);
    if (!nearRes.ok) return null;
    const nearRows = await nearRes.json();
    if (!nearRows.length) return null;
    const dist = parseFloat(nearRows[0]._dist);
    // 150m radius: keeps us inside the same block, but generous enough to
    // catch geocoder misses where the parcel polygon is well off the
    // street centerline (common on corner lots and large multifamily).
    if (!(dist >= 0) || dist > 150) return null;
    rows = nearRows;
  }

  const r = rows[0];
  return {
    assessedValue: parseFloat(r.assessed_value) || null,
    assessmentYear: r.roll_year || null,
    yearBuilt: r.year_of_construction || null,
    buildingClass: r.assessment_class || null,
    lotSizeSqM: parseFloat(r.land_size_sm) || null,
    raw: r,
  };
}

export async function getPermits({ lat, lng, radiusMeters = 1000, sinceYears = 2 }) {
  const sinceDate = new Date();
  sinceDate.setFullYear(sinceDate.getFullYear() - sinceYears);
  const since = sinceDate.toISOString().slice(0, 10);
  const u = url(DS_PERMITS, {
    $where: `within_circle(point, ${lat}, ${lng}, ${radiusMeters}) AND applieddate > '${since}'`,
    $limit: 100,
    $order: "applieddate DESC",
  });
  const res = await fetch(u);
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Calgary Land Use Bylaw — common districts:
 *   R-C1 / R-CG: low-density residential (1-2 units)
 *   R-2 / R-CG / R-G: row housing, semis
 *   M-C1 / M-C2: multi-family low-rise (3-storey)
 *   M-H1 / M-H2: multi-family mid-high (4-6+ storeys)
 *   C-N1: neighborhood commercial
 *   C-C2: community commercial
 *   MU-1 / MU-2: mixed use
 */
function normalize(r, address) {
  const zone = r.lu_code || r.land_use_district || r.lu_designation || "";
  return {
    city: "calgary",
    found: true,
    address,
    zone,
    zoneDescription: ZONE_DESCRIPTIONS[zone] || r.description || null,
    permittedUses: [], // Calgary's data doesn't list per-parcel uses; lookup by zone code
    maxHeightM: ZONE_DEFAULTS[zone]?.maxHeightM || null,
    maxStoreys: ZONE_DEFAULTS[zone]?.maxStoreys || null,
    maxFAR: ZONE_DEFAULTS[zone]?.maxFAR || null,
    maxUnits: ZONE_DEFAULTS[zone]?.maxUnits || null,
    minLotAreaM2: ZONE_DEFAULTS[zone]?.minLotAreaM2 || null,
    setbacks: { frontM: null, rearM: null, sideM: null },
    raw: r,
  };
}

const ZONE_DEFAULTS = {
  "R-C1":  { maxHeightM: 10, maxStoreys: 2, maxFAR: 0.6, maxUnits: 1, minLotAreaM2: 350 },
  "R-C2":  { maxHeightM: 10, maxStoreys: 2, maxFAR: 0.7, maxUnits: 2, minLotAreaM2: 460 },
  "R-CG":  { maxHeightM: 11, maxStoreys: 3, maxFAR: 1.0, maxUnits: 4, minLotAreaM2: 350 },
  "R-G":   { maxHeightM: 11, maxStoreys: 3, maxFAR: 1.0, maxUnits: 6, minLotAreaM2: 350 },
  "M-C1":  { maxHeightM: 12, maxStoreys: 3, maxFAR: 1.0, maxUnits: null, minLotAreaM2: 460 },
  "M-C2":  { maxHeightM: 14, maxStoreys: 4, maxFAR: 1.5, maxUnits: null, minLotAreaM2: 460 },
  "M-H1":  { maxHeightM: 16, maxStoreys: 4, maxFAR: 2.0, maxUnits: null, minLotAreaM2: 600 },
  "M-H2":  { maxHeightM: 23, maxStoreys: 6, maxFAR: 2.5, maxUnits: null, minLotAreaM2: 750 },
  "MU-1":  { maxHeightM: 16, maxStoreys: 4, maxFAR: 2.0, maxUnits: null, minLotAreaM2: null },
  "MU-2":  { maxHeightM: 23, maxStoreys: 6, maxFAR: 2.8, maxUnits: null, minLotAreaM2: null },
  "C-N1":  { maxHeightM: 12, maxStoreys: 3, maxFAR: 1.5, maxUnits: null, minLotAreaM2: null },
  "C-C2":  { maxHeightM: 14, maxStoreys: 4, maxFAR: 2.0, maxUnits: null, minLotAreaM2: null },
};

const ZONE_DESCRIPTIONS = {
  "R-C1":  "Residential Contextual One — single detached only",
  "R-C2":  "Residential Contextual Two — single or duplex",
  "R-CG":  "Residential Contextual Grade — row housing, fourplex",
  "R-G":   "Residential Grade — up to 6-plex with secondary suites",
  "M-C1":  "Multi-Residential Contextual Low — 3-storey walkup apartments",
  "M-C2":  "Multi-Residential Contextual Medium — 4-storey apartments",
  "M-H1":  "Multi-Residential High — 4-storey mid-rise",
  "M-H2":  "Multi-Residential High Density — 6+ storey",
  "MU-1":  "Mixed Use One — residential over commercial, low-rise",
  "MU-2":  "Mixed Use Two — residential over commercial, mid-rise",
  "C-N1":  "Commercial Neighborhood — small retail, services",
  "C-C2":  "Commercial Community — broader retail catchment",
};
