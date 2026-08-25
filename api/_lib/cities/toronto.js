/**
 * Toronto city adapter — ArcGIS Feature Service for live zoning lookup,
 * plus open.toronto.ca CKAN for permits.
 *
 * Toronto's official open-data portal only ships the Zoning By-law 569-2013
 * as bulk GeoJSON / SHP downloads — no point-in-polygon REST query endpoint.
 * Hosted ArcGIS mirrors of the same dataset DO support spatial queries; the
 * one we use here was the most reliable mirror at last verification and has
 * the canonical By-law 569-2013 schema (ZN_ZONE, FSI_TOTAL, UNITS, DENSITY).
 *
 * If this mirror goes offline, swap TORONTO_ZONING_SERVICE for another
 * Esri Hub-hosted copy — the schema is stable, just the host changes.
 *
 * Permits are available via the CKAN datastore.
 *
 * All fetches wrapped in try/catch → graceful degradation to {found:false}
 * on any network / schema / dataset-rename failure.
 */

// Esri Feature Service mirror of Toronto's Zoning By-law 569-2013.
// Layer 0 = "Zones" polygon layer with canonical schema.
const TORONTO_ZONING_SERVICE =
  "https://services7.arcgis.com/AHJOWTX3sFcnmA9U/arcgis/rest/services/City_of_Toronto_Zoning_ByLaws/FeatureServer/0";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";

async function fetchArcGIS(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`ArcGIS fetch failed: ${r.status}`);
  return r.json();
}

// Helper: Toronto's mirror dataset uses -1 to mean "not specified for this
// zone family." Treat as null so downstream callers don't display -1 metres.
const notSpecified = v => (v == null || v === -1 || v === "-1") ? null : v;

export async function getZoning({ lat, lng, address }) {
  try {
    const data = await fetchArcGIS(`${TORONTO_ZONING_SERVICE}/query`, {
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      f: "json",
    });
    const feat = data?.features?.[0];
    if (!feat) return { city: "toronto", found: false, address };

    const a = feat.attributes || {};
    // Toronto schema (By-law 569-2013):
    //   ZN_ZONE       — base zone code (R, CR, R3, CR2.5, etc.)
    //   ZN_HOLDING    — "N" or "Y" — site-specific holding provision flag
    //   GEN_ZONE      — numeric zone category (200s = downtown, etc.)
    //   FSI_TOTAL     — max floor-space index (FAR equivalent)
    //   UNITS         — max permitted dwelling units (-1 = not specified)
    //   DENSITY       — units per hectare
    //   FRONTAGE      — minimum lot frontage
    //   PRCNT_COMM    — max % commercial floor space
    //   PRCNT_RES     — max % residential floor space
    //   COVERAGE      — max lot coverage %
    const zone = a.ZN_ZONE || a.ZONE_CAT || a.ZN_STRING || null;
    if (!zone) return { city: "toronto", found: false, address };

    const info = ZONE_INFO[zone] || matchPrefix(zone) || {};
    const fsiLive   = notSpecified(a.FSI_TOTAL);
    const unitsLive = notSpecified(a.UNITS);
    const densLive  = notSpecified(a.DENSITY);

    return {
      city: "toronto",
      found: true,
      address,
      zone,
      zoneDescription: info.description || null,
      permittedUses: [],
      // Toronto's mirror doesn't publish absolute heights — we surface FSI
      // (floor-space index) as the density proxy. maxStoreys still falls
      // back to the by-law reference table.
      maxHeightM:   info.maxHeightM || null,
      maxStoreys:   info.maxStoreys || null,
      // Prefer per-parcel FSI from the live data when published; fall
      // back to the zone-family default.
      maxFAR:       fsiLive != null ? fsiLive : info.maxFAR,
      maxUnits:     unitsLive != null ? unitsLive : info.maxUnits,
      maxDensity:   densLive,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: "https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/",
      bylawNumber: "569-2013",
      // Holding provision flag — useful signal for developers screening
      // for sites with active development controls.
      holdingProvision: a.ZN_HOLDING === "Y",
      // % commercial / residential split helps mixed-use deal screening.
      maxCommercialPct: notSpecified(a.PRCNT_COMM),
      maxResidentialPct: notSpecified(a.PRCNT_RES),
      maxCoveragePct:   notSpecified(a.COVERAGE),
      raw: a,
    };
  } catch (e) {
    console.warn("[toronto/zoning]", e.message);
    return { city: "toronto", found: false, address, _error: e.message };
  }
}

// MPAC restricts open access to per-property assessed values across Ontario
// (Toronto included — only the city tax roll is public, not the assessed
// value). Return an explicit "unavailable" signal so the UI can render a
// "MPAC-restricted — enter manually" nudge. Same pattern as ottawa.js /
// hamilton.js / mississauga.js.
export async function getAssessment() {
  return {
    assessedValue: null,
    assessmentYear: null,
    yearBuilt: null,
    unavailable: true,
    unavailableReason: "MPAC does not publish per-property values via open data for Toronto (only the city tax roll is public). Look up your roll number at aboutmyproperty.ca (MPAC login required) or enter the assessed value manually.",
    source: "toronto-mpac-restricted",
  };
}

export async function getPermits({ lat, lng, radiusMeters = 1000 }) {
  try {
    // Building permits — CKAN datastore. Most reliable filter is by address keyword;
    // exact bbox queries on CKAN require Datastore _full_text limitations.
    // Fall back to empty array on any error.
    const r = await fetch(`${CKAN_BASE}/datastore_search?resource_id=actively-issued-building-permits&limit=50`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const records = data?.result?.records || [];
    // Filter to a rough bbox around the target
    const dlat = radiusMeters / 111000;
    const dlng = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
    return records
      .filter(p => {
        const plat = parseFloat(p.LATITUDE || p.latitude);
        const plng = parseFloat(p.LONGITUDE || p.longitude);
        if (isNaN(plat) || isNaN(plng)) return false;
        return Math.abs(plat - lat) < dlat && Math.abs(plng - lng) < dlng;
      })
      .slice(0, 20)
      .map(p => ({
        permit_date:        p.ISSUED_DATE || p.APPLICATION_DATE || null,
        issue_date:         p.ISSUED_DATE || null,
        work_type:          p.WORK || p.WORK_DESCRIPTION || null,
        job_description:    p.WORK_DESCRIPTION || p.DESCRIPTION || null,
        construction_value: parseFloat(p.EST_CONSTRUCTION_COST) || null,
        units_added:        parseInt(p.RESIDENTIAL_UNITS_GAINED, 10) || null,
        building_type:      p.BUILDING_TYPE || null,
        address:            [p.STREET_NUM, p.STREET_NAME, p.STREET_TYPE].filter(Boolean).join(" ") || null,
        latitude:           parseFloat(p.LATITUDE || p.latitude) || null,
        longitude:          parseFloat(p.LONGITUDE || p.longitude) || null,
      }));
  } catch (e) {
    console.warn("[toronto/permits]", e.message);
    return [];
  }
}

function matchPrefix(zone) {
  if (!zone) return null;
  const upper = String(zone).toUpperCase();
  for (const prefix of Object.keys(ZONE_INFO)) {
    if (upper.startsWith(prefix.toUpperCase())) return ZONE_INFO[prefix];
  }
  return null;
}

// Toronto Zoning By-law 569-2013 — quick reference for common zones.
const ZONE_INFO = {
  "R":   { description: "Residential",                       maxHeightM: 10,  maxStoreys: 3,   maxFAR: 0.6,  maxUnits: 2,   minLotAreaM2: 280 },
  "RD":  { description: "Residential Detached",              maxHeightM: 10,  maxStoreys: 3,   maxFAR: 0.6,  maxUnits: 2,   minLotAreaM2: 280 },
  "RS":  { description: "Residential Semi-Detached",         maxHeightM: 10,  maxStoreys: 2.5, maxFAR: 0.6,  maxUnits: 2,   minLotAreaM2: 200 },
  "RT":  { description: "Residential Townhouse",             maxHeightM: 12,  maxStoreys: 3,   maxFAR: 0.8,  maxUnits: 4,   minLotAreaM2: 180 },
  "RM":  { description: "Residential Multiple",              maxHeightM: 14,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: 10,  minLotAreaM2: 360 },
  "RA":  { description: "Residential Apartment",             maxHeightM: 23,  maxStoreys: 6,   maxFAR: 1.5,  maxUnits: null,minLotAreaM2: 600 },
  "RAC": { description: "Residential Apartment Commercial",  maxHeightM: 30,  maxStoreys: 8,   maxFAR: 2.5,  maxUnits: null,minLotAreaM2: null },
  "CR":  { description: "Commercial Residential",            maxHeightM: 16,  maxStoreys: 4,   maxFAR: 2.0,  maxUnits: null,minLotAreaM2: null },
  "CRE": { description: "Commercial Residential Employment", maxHeightM: 30,  maxStoreys: 8,   maxFAR: 3.0,  maxUnits: null,minLotAreaM2: null },
  "CL":  { description: "Commercial Local",                  maxHeightM: 10,  maxStoreys: 3,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "E":   { description: "Employment",                        maxHeightM: 12,  maxStoreys: 3,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "EL":  { description: "Employment Light Industrial",       maxHeightM: 12,  maxStoreys: 3,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "EH":  { description: "Employment Heavy Industrial",       maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.5,  maxUnits: null,minLotAreaM2: null },
  "I":   { description: "Institutional",                     maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "OS":  { description: "Open Space",                        maxHeightM: 6,   maxStoreys: 1,   maxFAR: 0.1,  maxUnits: null,minLotAreaM2: null },
};
