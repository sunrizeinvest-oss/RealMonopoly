/**
 * Mississauga city adapter — ArcGIS Feature Service for live zoning lookup
 * against the City of Mississauga's Zoning By-law 0225-2007.
 *
 * Polygon dataset at services6.arcgis.com supports point-in-polygon spatial
 * queries (esriSpatialRelIntersects). Same pattern as Toronto + Ottawa.
 *
 * Assessment data: MPAC restricts per-property values, same as Toronto +
 * Ottawa. getAssessment returns null cleanly.
 *
 * Permits: deferred until there's a real user ask — Mississauga's permit
 * data lives in a separate CKAN endpoint that requires keyed queries.
 *
 * All fetches in try/catch → {found:false} on schema drift or network
 * failure. Zero impact on other cities if Mississauga's open-data
 * portal renames the service.
 */

const MISSISSAUGA_ZONING_SERVICE =
  "https://services6.arcgis.com/hM5ymMLbxIyWTjn2/arcgis/rest/services/Mississauga_Zoning_Bylaw/FeatureServer/0";

async function fetchArcGIS(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`ArcGIS fetch failed: ${r.status}`);
  return r.json();
}

export async function getZoning({ lat, lng, address }) {
  try {
    const data = await fetchArcGIS(`${MISSISSAUGA_ZONING_SERVICE}/query`, {
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      f: "json",
    });
    const feat = data?.features?.[0];
    if (!feat) return { city: "mississauga", found: false, address };

    const a = feat.attributes || {};
    // Mississauga schema: ZONE_CODE is the full parcel-specific code
    // (e.g. "H-CC2(2)"). BASE_ZONE_DESIGNATION strips the holding/exception
    // prefix down to the family (e.g. "CC2"). EXCEPTION_ZONE_NUMBER /
    // _DESIGNATION encode site-specific deviations.
    const zone = a.ZONE_CODE || a.EXCEPTION_ZONE_DESIGNATION || a.BASE_ZONE_DESIGNATION || null;
    if (!zone) return { city: "mississauga", found: false, address };

    const base = a.BASE_ZONE_DESIGNATION || zone;
    const info = ZONE_INFO[base] || matchPrefix(base) || matchPrefix(zone) || {};

    return {
      city: "mississauga",
      found: true,
      address,
      zone,
      zoneDescription:
        a.ZONE_DESCRIPTION || info.description || a.ZONE_CATEGORY || null,
      permittedUses: [],
      maxHeightM:  info.maxHeightM || null,
      maxStoreys:  info.maxStoreys || null,
      maxFAR:      info.maxFAR || null,
      maxUnits:    info.maxUnits || null,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: "https://www.mississauga.ca/services-and-programs/building-and-renovating/zoning-information/",
      bylawNumber: a.BYLAW || "0225-2007",
      // Surface holding-provision + exception flags — useful signal for
      // developers screening for sites with active development controls.
      holdingProvision: a.HOLDING_PROVISION === "Y",
      exceptionNumber: a.EXCEPTION_ZONE_NUMBER || null,
      raw: a,
    };
  } catch (e) {
    console.warn("[mississauga/zoning]", e.message);
    return { city: "mississauga", found: false, address, _error: e.message };
  }
}

// MPAC restricts per-property assessed values in Ontario open data. Return
// null cleanly so the property card silently omits the assessment section.
export async function getAssessment() { return null; }

// Permits deferred until a user asks for them. Mississauga's permit data
// is on a separate CKAN endpoint that requires keyed queries.
export async function getPermits() { return []; }

function matchPrefix(zone) {
  if (!zone) return null;
  const upper = String(zone).toUpperCase();
  // Sort longest-first so "CC2" matches before "C".
  const prefixes = Object.keys(ZONE_INFO).sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (upper.startsWith(p.toUpperCase())) return ZONE_INFO[p];
  }
  return null;
}

// Mississauga Zoning By-law 0225-2007 — quick reference for common zone
// families. Per-parcel codes often carry suffix exceptions ("(2)") that
// override these defaults; the adapter still surfaces the per-parcel
// description via ZONE_DESCRIPTION when present.
const ZONE_INFO = {
  // ── Residential ──
  "R1":  { description: "Residential Detached",                       maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 0.45, maxUnits: 1,    minLotAreaM2: 270 },
  "R2":  { description: "Residential Detached (smaller lots)",        maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 0.55, maxUnits: 1,    minLotAreaM2: 250 },
  "R3":  { description: "Residential Semi-Detached",                  maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 0.55, maxUnits: 2,    minLotAreaM2: 230 },
  "R4":  { description: "Residential Duplex",                         maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 0.55, maxUnits: 2,    minLotAreaM2: 270 },
  "R5":  { description: "Residential Townhouse",                      maxHeightM: 11,   maxStoreys: 3,  maxFAR: 0.75, maxUnits: 6,    minLotAreaM2: 180 },
  "R6":  { description: "Residential Multi-Unit",                     maxHeightM: 14,   maxStoreys: 4,  maxFAR: 1.0,  maxUnits: 12,   minLotAreaM2: 400 },
  "R7":  { description: "Residential Apartment — low rise",           maxHeightM: 14,   maxStoreys: 4,  maxFAR: 1.0,  maxUnits: null, minLotAreaM2: 800 },
  "R8":  { description: "Residential Apartment — mid rise",           maxHeightM: 23,   maxStoreys: 6,  maxFAR: 2.0,  maxUnits: null, minLotAreaM2: null },
  "R9":  { description: "Residential Apartment — high rise",          maxHeightM: 50,   maxStoreys: 14, maxFAR: 3.5,  maxUnits: null, minLotAreaM2: null },
  "RM1": { description: "Residential Mixed — townhouse + apartment",  maxHeightM: 14,   maxStoreys: 4,  maxFAR: 1.0,  maxUnits: null, minLotAreaM2: null },

  // ── Commercial / Mixed-Use ──
  "C1":  { description: "Neighbourhood Commercial",                   maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 0.75, maxUnits: null, minLotAreaM2: null },
  "C2":  { description: "Convenience Commercial",                     maxHeightM: 10.7, maxStoreys: 2,  maxFAR: 1.0,  maxUnits: null, minLotAreaM2: null },
  "C3":  { description: "General Commercial",                         maxHeightM: 14,   maxStoreys: 4,  maxFAR: 1.5,  maxUnits: null, minLotAreaM2: null },
  "C4":  { description: "Mainstreet Commercial",                      maxHeightM: 14,   maxStoreys: 4,  maxFAR: 2.0,  maxUnits: null, minLotAreaM2: null },
  "C5":  { description: "Office Commercial",                          maxHeightM: 30,   maxStoreys: 8,  maxFAR: 3.0,  maxUnits: null, minLotAreaM2: null },

  // ── Downtown Core / City Centre (mixed-use high density) ──
  "CC1": { description: "Downtown Core — Civic",                      maxHeightM: 40,   maxStoreys: 12, maxFAR: 4.0,  maxUnits: null, minLotAreaM2: null },
  "CC2": { description: "Downtown Core — Mixed Use",                  maxHeightM: 50,   maxStoreys: 14, maxFAR: 4.5,  maxUnits: null, minLotAreaM2: null },
  "CC3": { description: "Downtown Core — Residential",                maxHeightM: 50,   maxStoreys: 14, maxFAR: 4.0,  maxUnits: null, minLotAreaM2: null },
  "CC4": { description: "Downtown Core — Major Node",                 maxHeightM: 75,   maxStoreys: 25, maxFAR: 5.5,  maxUnits: null, minLotAreaM2: null },

  // ── Employment ──
  "E1":  { description: "Business Employment",                        maxHeightM: 15,   maxStoreys: 4,  maxFAR: 1.0,  maxUnits: null, minLotAreaM2: null },
  "E2":  { description: "General Employment",                         maxHeightM: 20,   maxStoreys: 4,  maxFAR: 1.5,  maxUnits: null, minLotAreaM2: null },
  "E3":  { description: "Industrial",                                 maxHeightM: 25,   maxStoreys: 5,  maxFAR: 2.0,  maxUnits: null, minLotAreaM2: null },

  // ── Open / Special ──
  "OS":  { description: "Open Space",                                 maxHeightM: 6,    maxStoreys: 1,  maxFAR: 0.1,  maxUnits: null, minLotAreaM2: null },
  "O":   { description: "Open Space",                                 maxHeightM: 6,    maxStoreys: 1,  maxFAR: 0.1,  maxUnits: null, minLotAreaM2: null },
  "I":   { description: "Institutional",                              maxHeightM: 15,   maxStoreys: 4,  maxFAR: 1.0,  maxUnits: null, minLotAreaM2: null },
  "D":   { description: "Development",                                maxHeightM: null, maxStoreys: null, maxFAR: null, maxUnits: null, minLotAreaM2: null },
};
