/**
 * Toronto city adapter — ArcGIS Feature Service for live zoning lookup,
 * plus open.toronto.ca CKAN for permits.
 *
 * Toronto publishes the Zoning By-law 569-2013 as an ArcGIS REST
 * Feature Service. ArcGIS supports a point-in-polygon spatial query
 * out of the box (esriSpatialRelIntersects on an esriGeometryPoint).
 *
 * Permits are available via the CKAN datastore.
 *
 * All fetches wrapped in try/catch → graceful degradation to {found:false}
 * on any network / schema / dataset-rename failure.
 */

// Esri Feature Service for Toronto's current Zoning By-law (City of Toronto Open Data).
// The exact service URL has rotated a few times; this is the most current public layer.
const TORONTO_ZONING_SERVICE =
  "https://services3.arcgis.com/b9WvedVPoizGfvfD/ArcGIS/rest/services/COTGEO_ZONING_BYLAW/FeatureServer/0";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";

async function fetchArcGIS(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`ArcGIS fetch failed: ${r.status}`);
  return r.json();
}

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
    // Toronto's zoning by-law splits the label into category + subcategory.
    const zone =
      a.ZN_ZONE ||
      a.ZONE_CAT ||
      a.ZN_STRING ||
      a.Z_LABEL ||
      a.ZONING ||
      null;
    if (!zone) return { city: "toronto", found: false, address };

    const info = ZONE_INFO[zone] || matchPrefix(zone) || {};
    return {
      city: "toronto",
      found: true,
      address,
      zone,
      zoneDescription: info.description || a.Z_NAME || a.SUBJECT || null,
      permittedUses: [],
      maxHeightM: a.HEIGHT || info.maxHeightM || null,
      maxStoreys: info.maxStoreys || null,
      maxFAR: info.maxFAR || null,
      maxUnits: info.maxUnits || null,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: "https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/",
      raw: a,
    };
  } catch (e) {
    console.warn("[toronto/zoning]", e.message);
    return { city: "toronto", found: false, address, _error: e.message };
  }
}

// Toronto's MPAC assessment is not on open data; only city tax roll is.
// Return null cleanly — the card silently omits the assessment section.
export async function getAssessment() { return null; }

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
