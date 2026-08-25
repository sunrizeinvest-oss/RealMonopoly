/**
 * Ottawa city adapter — ArcGIS Feature Service for live zoning lookup.
 *
 * Ottawa publishes "Existing Zoning May 2024" as an ArcGIS REST Feature
 * Service maintained by the City of Ottawa's Planning Group. The polygon
 * layer (id=3) supports point-in-polygon spatial queries out of the box
 * (esriSpatialRelIntersects on an esriGeometryPoint).
 *
 * Assessment data: NOT available via Ottawa open data — MPAC restricts
 * public access to per-property values. getAssessment returns null so
 * the property card silently omits the assessment section, same pattern
 * as the Toronto adapter.
 *
 * Permits: building permits are available via the open.ottawa.ca catalog
 * but the bulk endpoint requires CKAN-style queries; deferred to a
 * follow-up if there's demand.
 *
 * All fetches wrapped in try/catch → graceful degradation to {found:false}
 * on any network / schema / dataset-rename failure.
 */

// Esri Feature Service — Existing Zoning By-law 2008-250 (City of Ottawa).
// Layer 3 is the polygon zoning layer. Layer 1 is the overlays (heritage,
// floodplain) which we ignore for now.
const OTTAWA_ZONING_SERVICE =
  "https://services.arcgis.com/G6F8XLCl5KtAlZ2G/arcgis/rest/services/Existing_Zoning_May_2024/FeatureServer/3";

async function fetchArcGIS(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`ArcGIS fetch failed: ${r.status}`);
  return r.json();
}

export async function getZoning({ lat, lng, address }) {
  try {
    const data = await fetchArcGIS(`${OTTAWA_ZONING_SERVICE}/query`, {
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      f: "json",
    });
    const feat = data?.features?.[0];
    if (!feat) return { city: "ottawa", found: false, address };

    const a = feat.attributes || {};
    // Ottawa's schema: ZONE_CODE is the full code (e.g. "R4UD"), PARENTZONE
    // is the high-level family (e.g. "R4"), ZONE_MAIN is the broad bucket
    // (e.g. "R4"). ZNAME_EN is the human-readable description.
    const zone = a.ZONE_CODE || a.PARENTZONE || a.ZONE_MAIN || null;
    if (!zone) return { city: "ottawa", found: false, address };

    const parent = a.PARENTZONE || a.ZONE_MAIN || null;
    const info = ZONE_INFO[parent] || ZONE_INFO[zone] || matchPrefix(zone) || {};

    // HEIGHTINFO is a freeform string in the Ottawa dataset — sometimes it
    // means metres ("27"), sometimes storeys ("4"). Parse cautiously.
    const heightRaw = a.HEIGHTINFO != null ? String(a.HEIGHTINFO).trim() : "";
    const heightNum = parseFloat(heightRaw);
    const heightLooksLikeMetres = !isNaN(heightNum) && heightNum >= 10;
    const heightLooksLikeStoreys = !isNaN(heightNum) && heightNum > 0 && heightNum < 10;

    return {
      city: "ottawa",
      found: true,
      address,
      zone,
      zoneDescription: a.ZNAME_EN || info.description || null,
      permittedUses: [],
      maxHeightM:  heightLooksLikeMetres ? heightNum : (info.maxHeightM || null),
      maxStoreys:  heightLooksLikeStoreys ? heightNum : (info.maxStoreys || null),
      maxFAR:      info.maxFAR || null,
      maxUnits:    info.maxUnits || null,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: a.URL || "https://ottawa.ca/en/planning-development-and-construction/zoning-and-land-use/zoning-law-2008-250",
      bylawNumber: a.BYLAW_NUM || "2008-250",
      raw: a,
    };
  } catch (e) {
    console.warn("[ottawa/zoning]", e.message);
    return { city: "ottawa", found: false, address, _error: e.message };
  }
}

// MPAC restricts open access to per-property assessed values across Ontario
// (except Toronto, which has its own city feed). Instead of returning null
// silently, we return an explicit "unavailable" object so the UI can render
// a clear "MPAC-restricted — enter manually" nudge rather than an empty card.
export async function getAssessment() {
  return {
    assessedValue: null,
    assessmentYear: null,
    yearBuilt: null,
    unavailable: true,
    unavailableReason: "MPAC does not publish per-property values via open data for Ottawa. Look up your roll number at aboutmyproperty.ca (MPAC login required) or enter the assessed value manually.",
    source: "ottawa-mpac-restricted",
  };
}

// Permits: Ottawa publishes building permits via CKAN but the endpoint
// requires per-request keys. Deferred until there's a real user ask.
/**
 * Ottawa permits — actually Development Applications, which are a stronger
 * broker signal than issued building permits (they precede the permit; they
 * cover rezonings, site plan control, subdivision applications, minor
 * variances, etc.). We keep the `nearbyPermits` field name for UI parity.
 *
 * Data source: Ottawa's own ArcGIS map service at maps.ottawa.ca — the same
 * infra that serves their public parcel/zoning maps. Coverage begins Feb 1,
 * 2008 (per service description).
 *
 * Rows include LATITUDE + LONGITUDE + APPLICATION_DATE + APPLICATION_TYPE_EN
 * as attributes, so we filter server-side by lat/lng bbox and client-side
 * by date (ArcGIS Date-field BETWEEN + epoch millis rejected upstream).
 */
const OTTAWA_DEVAPPS_SERVICE =
  "https://maps.ottawa.ca/arcgis/rest/services/Development_Applications/MapServer/0";

export async function getPermits({ lat, lng, radiusMeters = 1000, sinceYears = 2 }) {
  try {
    const dlat = radiusMeters / 111000;
    const dlng = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));

    // Server-side WHERE on LATITUDE/LONGITUDE is reliable (Double fields).
    // Date filter happens client-side after the fetch.
    const where = `LATITUDE BETWEEN ${lat - dlat} AND ${lat + dlat} `
                + `AND LONGITUDE BETWEEN ${lng - dlng} AND ${lng + dlng}`;
    const sinceMs = Date.now() - sinceYears * 365 * 24 * 3600 * 1000;

    const data = await fetchArcGIS(`${OTTAWA_DEVAPPS_SERVICE}/query`, {
      f: "json",
      where,
      outFields: "APPLICATION_DATE,APPLICATION_NUMBER,APPLICATION_TYPE_EN,OBJECT_CURRENT_STATUS_EN,OBJECT_CURRENT_STATUS_DATE,ADDRESS_NUMBER_ROAD_NAME,WARD_NUMBER_EN,LATITUDE,LONGITUDE",
      returnGeometry: false,
      resultRecordCount: 50,
      orderByFields: "APPLICATION_DATE DESC",
    });

    const features = data?.features || [];
    return features
      .map(f => {
        const a = f.attributes || {};
        const appDateMs = a.APPLICATION_DATE || 0;
        const iso = appDateMs ? new Date(appDateMs).toISOString() : null;
        return {
          permit_date:        iso,
          issue_date:         iso,
          application_date:   iso,
          application_number: a.APPLICATION_NUMBER ? String(a.APPLICATION_NUMBER).trim() : null,
          work_type:          a.APPLICATION_TYPE_EN ? String(a.APPLICATION_TYPE_EN).trim() : null,
          job_description:    a.OBJECT_CURRENT_STATUS_EN ? String(a.OBJECT_CURRENT_STATUS_EN).trim() : null,
          status:             a.OBJECT_CURRENT_STATUS_EN ? String(a.OBJECT_CURRENT_STATUS_EN).trim() : null,
          address:            a.ADDRESS_NUMBER_ROAD_NAME ? String(a.ADDRESS_NUMBER_ROAD_NAME).trim() : null,
          ward:               a.WARD_NUMBER_EN ? String(a.WARD_NUMBER_EN).trim() : null,
          latitude:           a.LATITUDE || null,
          longitude:          a.LONGITUDE || null,
          _dateMs:            appDateMs,
          source:             "ottawa",
          record_type:        "development_application",  // signal to UI: this isn't a building permit
        };
      })
      // Client-side recency filter
      .filter(p => !p._dateMs || p._dateMs >= sinceMs)
      .sort((a, b) => (b._dateMs || 0) - (a._dateMs || 0))
      .slice(0, 20)
      .map(p => { const { _dateMs, ...rest } = p; return rest; });
  } catch (e) {
    console.warn("[ottawa/permits]", e.message);
    return [];
  }
}

function matchPrefix(zone) {
  if (!zone) return null;
  const upper = String(zone).toUpperCase();
  // Sort prefixes longest-first so "R4Z" matches "R4" before "R".
  const prefixes = Object.keys(ZONE_INFO).sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (upper.startsWith(p.toUpperCase())) return ZONE_INFO[p];
  }
  return null;
}

// Ottawa Zoning By-law 2008-250 — quick reference for the common zone families.
// Source: documents.ottawa.ca/sites/documents/files/documents/zoning_bylaw_part*_en.pdf
//
// Heights and densities are general baselines for the parent zone — the
// per-parcel suffix (e.g. R4UD) often overrides these. The adapter prefers
// the per-parcel HEIGHTINFO value when present.
const ZONE_INFO = {
  // ── Residential ──
  "R1":  { description: "Residential First Density — detached only",      maxHeightM: 8,   maxStoreys: 2,   maxFAR: 0.55, maxUnits: 1,   minLotAreaM2: 300 },
  "R2":  { description: "Residential Second Density — detached + semi",   maxHeightM: 8,   maxStoreys: 2,   maxFAR: 0.55, maxUnits: 2,   minLotAreaM2: 270 },
  "R3":  { description: "Residential Third Density — townhouses",         maxHeightM: 11,  maxStoreys: 3,   maxFAR: 0.65, maxUnits: 6,   minLotAreaM2: 270 },
  "R4":  { description: "Residential Fourth Density — low-rise apartment",maxHeightM: 14.5,maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: 450 },
  "R5":  { description: "Residential Fifth Density — mid-rise apartment", maxHeightM: 23,  maxStoreys: 9,   maxFAR: 2.0,  maxUnits: null,minLotAreaM2: 720 },

  // ── Mixed-Use & Mainstreet ──
  "AM":  { description: "Arterial Mainstreet — mixed-use along arterials",maxHeightM: 30,  maxStoreys: 9,   maxFAR: 3.0,  maxUnits: null,minLotAreaM2: null },
  "TM":  { description: "Traditional Mainstreet — pedestrian-oriented",   maxHeightM: 15,  maxStoreys: 4,   maxFAR: 2.0,  maxUnits: null,minLotAreaM2: null },
  "GM":  { description: "General Mixed Use",                              maxHeightM: 20,  maxStoreys: 6,   maxFAR: 2.5,  maxUnits: null,minLotAreaM2: null },
  "MD":  { description: "Mixed-Use Downtown — high-density downtown core",maxHeightM: null,maxStoreys: null,maxFAR: null, maxUnits: null,minLotAreaM2: null },
  "LC":  { description: "Local Commercial",                               maxHeightM: 11,  maxStoreys: 3,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "MC":  { description: "Mixed-Use Centre",                               maxHeightM: 40,  maxStoreys: 12,  maxFAR: 4.0,  maxUnits: null,minLotAreaM2: null },

  // ── Industrial ──
  "IL":  { description: "Light Industrial",                               maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "IG":  { description: "General Industrial",                             maxHeightM: 20,  maxStoreys: 4,   maxFAR: 1.5,  maxUnits: null,minLotAreaM2: null },
  "IH":  { description: "Heavy Industrial",                               maxHeightM: 25,  maxStoreys: 5,   maxFAR: 2.0,  maxUnits: null,minLotAreaM2: null },
  "IP":  { description: "Business Park Industrial",                       maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },

  // ── Institutional, Open, Rural ──
  "I1":  { description: "Minor Institutional",                            maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
  "I2":  { description: "Major Institutional",                            maxHeightM: 30,  maxStoreys: 8,   maxFAR: 2.0,  maxUnits: null,minLotAreaM2: null },
  "O":   { description: "Park & Open Space",                              maxHeightM: 6,   maxStoreys: 1,   maxFAR: 0.1,  maxUnits: null,minLotAreaM2: null },
  "L":   { description: "Leisure",                                        maxHeightM: 10,  maxStoreys: 2,   maxFAR: 0.5,  maxUnits: null,minLotAreaM2: null },
  "DR":  { description: "Development Reserve",                            maxHeightM: null,maxStoreys: null,maxFAR: null, maxUnits: null,minLotAreaM2: null },
  "AG":  { description: "Agricultural",                                   maxHeightM: 11,  maxStoreys: 2,   maxFAR: 0.2,  maxUnits: 1,   minLotAreaM2: 4000 },
  "RU":  { description: "Rural Countryside",                              maxHeightM: 11,  maxStoreys: 2,   maxFAR: 0.2,  maxUnits: 1,   minLotAreaM2: 4000 },
  "VM":  { description: "Village Mixed Use",                              maxHeightM: 15,  maxStoreys: 4,   maxFAR: 1.0,  maxUnits: null,minLotAreaM2: null },
};
