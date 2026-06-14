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

// MPAC restricts open access to per-property assessed values in Ottawa.
// Return null cleanly — the card silently omits the assessment section.
export async function getAssessment() { return null; }

// Permits: Ottawa publishes building permits via CKAN but the endpoint
// requires per-request keys. Deferred until there's a real user ask.
export async function getPermits() { return []; }

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
