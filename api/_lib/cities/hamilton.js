/**
 * Hamilton city adapter — ArcGIS Feature Service for live zoning lookup
 * against the City of Hamilton's Zoning By-law.
 *
 * Polygon dataset at services.arcgis.com supports point-in-polygon spatial
 * queries (esriSpatialRelIntersects). LAYER ID is 1, not 0 — the service
 * has no layer 0. The polygon layer was found at id 1 during adapter v2
 * after the v1 attempt failed silently.
 *
 * IMPORTANT: this service rejects the simple "lng,lat" geometry string
 * form. We must pass the geometry as a JSON object with spatialReference.
 * The other 6 city adapters happily accept comma-string form, so Hamilton
 * is the outlier — keep this code path correct on schema refactors.
 *
 * Assessment data: MPAC restricts per-property values, same as Toronto +
 * Ottawa + Mississauga. getAssessment returns null cleanly.
 *
 * Permits: deferred — Hamilton's permit data lives behind a separate
 * CKAN endpoint with its own auth model.
 */

const HAMILTON_ZONING_SERVICE =
  "https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Zoning_By_law_Boundary/FeatureServer/1";

async function fetchArcGISJson(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`Hamilton ArcGIS fetch failed: ${r.status}`);
  return r.json();
}

export async function getZoning({ lat, lng, address }) {
  try {
    // Hamilton's service is picky: it rejects the "lng,lat" comma-string
    // form and only accepts a JSON geometry object with spatialReference.
    const geometryJson = JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 },
    });

    const data = await fetchArcGISJson(`${HAMILTON_ZONING_SERVICE}/query`, {
      geometry: geometryJson,
      geometryType: "esriGeometryPoint",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      f: "json",
    });
    const feat = data?.features?.[0];
    if (!feat) return { city: "hamilton", found: false, address };

    const a = feat.attributes || {};
    // Hamilton schema:
    //   ZONING_CODE   — base zone family (D1, D2, TOC1, C5, P3, etc.)
    //   ZONING_DESC   — human-readable description
    //   BY_LAW_NUMBER — current bylaw (e.g. "25-155")
    //   BY_LAW_URL    — direct PDF link to the bylaw
    //   EXCEPTION1/2  — site-specific exceptions
    //   HOLDING1/2    — site-specific holding provisions
    const zone = a.ZONING_CODE || null;
    if (!zone) return { city: "hamilton", found: false, address };

    const info = ZONE_INFO[zone] || matchPrefix(zone) || {};
    const hasException = !!(a.EXCEPTION1 || a.EXCEPTION2);
    const hasHolding   = !!(a.HOLDING1 || a.HOLDING2);

    return {
      city: "hamilton",
      found: true,
      address,
      zone,
      zoneDescription: a.ZONING_DESC || info.description || null,
      permittedUses: [],
      maxHeightM:  info.maxHeightM || null,
      maxStoreys:  info.maxStoreys || null,
      maxFAR:      info.maxFAR || null,
      maxUnits:    info.maxUnits || null,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: a.BY_LAW_URL || "https://www.hamilton.ca/zoning",
      bylawNumber: a.BY_LAW_NUMBER || a.PARENT_BY_LAW_NUMBER || null,
      holdingProvision: hasHolding,
      exceptionNumber: a.EXCEPTION1 || a.EXCEPTION2 || null,
      raw: a,
    };
  } catch (e) {
    console.warn("[hamilton/zoning]", e.message);
    return { city: "hamilton", found: false, address, _error: e.message };
  }
}

// MPAC restricts open access to per-property assessed values across Ontario
// (except Toronto, which has its own feed). Return an explicit "unavailable"
// signal so the UI can render a "MPAC-restricted — enter manually" nudge
// rather than empty state. Matches the ottawa.js + mississauga.js pattern.
export async function getAssessment() {
  return {
    assessedValue: null,
    assessmentYear: null,
    yearBuilt: null,
    unavailable: true,
    unavailableReason: "MPAC does not publish per-property values via open data for Hamilton. Look up your roll number at aboutmyproperty.ca (MPAC login required) or enter the assessed value manually.",
    source: "hamilton-mpac-restricted",
  };
}

// ─── Permits — street-name LIKE match ─────────────────────────────────────
// Hamilton's permit data is table-only (no geometry), so we can't bbox-filter
// like the other cities. Instead we extract the street name from the target
// address, LIKE-match against ORIGINALADDRESS1, then re-filter client-side
// by direction + house-number window (±40) for on-street relevance.
const HAMILTON_PERMITS_SERVICE =
  "https://services.arcgis.com/rYz782eMbySr2srL/arcgis/rest/services/Building_and_Demolition_Permits_2017_to_Present/FeatureServer/6";

function parseHamiltonAddress(addr) {
  if (!addr) return { number: null, streetKey: null };
  const s = String(addr).replace(/^\s*(unit\s+[#\d]+,?\s+)/i, "").trim();
  const m = s.match(/^\s*(\d+)\s+(.+?)(?:,|$)/);
  if (!m) return { number: null, streetKey: null };
  const number = parseInt(m[1], 10);
  let street = m[2].toUpperCase();
  // Strip common street-type suffixes but preserve cardinal direction
  street = street.replace(/\b(AVENUE|AVE|STREET|ST|ROAD|RD|DRIVE|DR|BOULEVARD|BLVD|COURT|CT|CRESCENT|CRES|CIRCLE|CIR|LANE|LN|PLACE|PL|TERRACE|TERR|PARKWAY|PKWY|HIGHWAY|HWY|WAY)\b/g, "");
  street = street.replace(/\s+/g, " ").trim();
  return { number, streetKey: street };
}

// Hamilton's `Building_and_Demolition_Permits_2017_to_Present` dataset stopped
// receiving new records in Dec 2023 (city hasn't refreshed the feed). Default
// window is stretched to 5 years so brokers still see historical context —
// otherwise every Hamilton lookup would return empty. When the city resumes
// publishing, drop back to `sinceYears = 2` in line with other adapters.
export async function getPermits({ address, sinceYears = 5 } = {}) {
  try {
    const { number, streetKey } = parseHamiltonAddress(address);
    if (!streetKey) return [];
    const roadName = streetKey.split(" ")[0].replace(/'/g, "''");
    if (roadName.length < 3) return [];

    const sinceMs = Date.now() - sinceYears * 365 * 24 * 3600 * 1000;
    const wantDirection = /\b([NSEW])\b/.exec(streetKey)?.[1] || null;
    const NUMBER_WINDOW = 40;

    const data = await fetchArcGISJson(`${HAMILTON_PERMITS_SERVICE}/query`, {
      f: "json",
      where: `UPPER(ORIGINALADDRESS1) LIKE '%${roadName}%'`,
      outFields: "PERMITNUMBER,ORIGINALADDRESS1,APPLIEDDATE,ISSUEDDATE,STATUSCURRENT,PERMITCLASS,WORKCLASS,DESCRIPTION",
      orderByFields: "ISSUEDDATE DESC",
      resultRecordCount: 200,
    });

    const features = data?.features || [];
    return features
      .map(f => {
        const a = f.attributes || {};
        const raw = String(a.ORIGINALADDRESS1 || "").toUpperCase().trim();
        const issue = a.ISSUEDDATE || a.APPLIEDDATE || 0;
        const iso = issue ? new Date(issue).toISOString() : null;
        const nm = raw.match(/^(\d+)\s+(.+?)$/);
        const permitNumber = nm ? parseInt(nm[1], 10) : null;
        const permitTail = nm ? nm[2] : raw;
        const permitDir = /\b([NSEW])\b/.exec(permitTail)?.[1] || null;
        return {
          permit_date:        iso,
          issue_date:         iso,
          _issueMs:           issue,
          _permitNumber:      permitNumber,
          _permitDir:         permitDir,
          permit_number:      a.PERMITNUMBER || null,
          work_type:          a.WORKCLASS || a.PERMITCLASS || null,
          job_description:    a.DESCRIPTION || null,
          status:             a.STATUSCURRENT || null,
          address:            raw || null,
          latitude:           null,
          longitude:          null,
          source:             "hamilton",
        };
      })
      .filter(p => !p._issueMs || p._issueMs >= sinceMs)
      .filter(p => !wantDirection || !p._permitDir || p._permitDir === wantDirection)
      .filter(p => {
        if (!number || !p._permitNumber) return true;
        return Math.abs(p._permitNumber - number) <= NUMBER_WINDOW;
      })
      .sort((a, b) => (b._issueMs || 0) - (a._issueMs || 0))
      .slice(0, 20)
      .map(p => { const { _issueMs, _permitNumber, _permitDir, ...rest } = p; return rest; });
  } catch (e) {
    console.warn("[hamilton/permits]", e.message);
    return [];
  }
}

function matchPrefix(zone) {
  if (!zone) return null;
  const upper = String(zone).toUpperCase();
  const prefixes = Object.keys(ZONE_INFO).sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (upper.startsWith(p.toUpperCase())) return ZONE_INFO[p];
  }
  return null;
}

// Hamilton Zoning By-law (the new consolidated 25-155 + parent 05-200) —
// quick reference for the common zone families. Per-parcel exceptions
// override these defaults; the adapter surfaces ZONING_DESC from the
// live data first.
const ZONE_INFO = {
  // ── Downtown core ──
  "D1":  { description: "Downtown Central Business District",     maxHeightM: 75,  maxStoreys: 25, maxFAR: 5.5, maxUnits: null, minLotAreaM2: null },
  "D2":  { description: "Downtown Mixed Use — Pedestrian Focus",  maxHeightM: 50,  maxStoreys: 16, maxFAR: 4.0, maxUnits: null, minLotAreaM2: null },
  "D3":  { description: "Downtown Mixed Use",                     maxHeightM: 40,  maxStoreys: 12, maxFAR: 3.5, maxUnits: null, minLotAreaM2: null },

  // ── Transit-oriented + mixed-use ──
  "TOC1":{ description: "Transit Oriented Corridor — Med Density",maxHeightM: 23,  maxStoreys: 7,  maxFAR: 2.5, maxUnits: null, minLotAreaM2: null },
  "TOC2":{ description: "Transit Oriented Corridor — High Density",maxHeightM:35,  maxStoreys: 10, maxFAR: 3.5, maxUnits: null, minLotAreaM2: null },
  "C5":  { description: "Mixed Use Medium Density",               maxHeightM: 23,  maxStoreys: 7,  maxFAR: 2.5, maxUnits: null, minLotAreaM2: null },
  "C4":  { description: "Mixed Use Low Density",                  maxHeightM: 14,  maxStoreys: 4,  maxFAR: 1.5, maxUnits: null, minLotAreaM2: null },
  "C3":  { description: "Commercial — Neighbourhood",             maxHeightM: 11,  maxStoreys: 3,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "C2":  { description: "Commercial — Highway",                   maxHeightM: 11,  maxStoreys: 3,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "C1":  { description: "Commercial — Local",                     maxHeightM: 10,  maxStoreys: 2,  maxFAR: 0.7, maxUnits: null, minLotAreaM2: null },

  // ── Residential ──
  "R1":  { description: "Residential — Single Detached",          maxHeightM: 10,  maxStoreys: 2,  maxFAR: 0.55,maxUnits: 1,    minLotAreaM2: 300 },
  "R2":  { description: "Residential — Detached + Semi",          maxHeightM: 10,  maxStoreys: 2,  maxFAR: 0.55,maxUnits: 2,    minLotAreaM2: 270 },
  "R3":  { description: "Residential — Townhouse",                maxHeightM: 11,  maxStoreys: 3,  maxFAR: 0.75,maxUnits: 6,    minLotAreaM2: 180 },
  "R4":  { description: "Residential — Multi-Unit",               maxHeightM: 14,  maxStoreys: 4,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: 400 },
  "R5":  { description: "Residential — Mid Rise",                 maxHeightM: 23,  maxStoreys: 7,  maxFAR: 2.0, maxUnits: null, minLotAreaM2: 720 },
  "R6":  { description: "Residential — High Rise",                maxHeightM: 50,  maxStoreys: 16, maxFAR: 3.5, maxUnits: null, minLotAreaM2: null },

  // ── Employment + industrial ──
  "M1":  { description: "Business Park",                          maxHeightM: 15,  maxStoreys: 4,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "M2":  { description: "Prestige Industrial",                    maxHeightM: 15,  maxStoreys: 4,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "M3":  { description: "Industrial — General",                   maxHeightM: 20,  maxStoreys: 4,  maxFAR: 1.5, maxUnits: null, minLotAreaM2: null },
  "M4":  { description: "Industrial — Heavy",                     maxHeightM: 25,  maxStoreys: 5,  maxFAR: 2.0, maxUnits: null, minLotAreaM2: null },

  // ── Institutional + open + utility ──
  "I1":  { description: "Institutional — Minor",                  maxHeightM: 15,  maxStoreys: 4,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
  "I2":  { description: "Institutional — Major",                  maxHeightM: 30,  maxStoreys: 8,  maxFAR: 2.0, maxUnits: null, minLotAreaM2: null },
  "P1":  { description: "Park — Neighbourhood",                   maxHeightM: 6,   maxStoreys: 1,  maxFAR: 0.1, maxUnits: null, minLotAreaM2: null },
  "P2":  { description: "Park — Community",                       maxHeightM: 6,   maxStoreys: 1,  maxFAR: 0.1, maxUnits: null, minLotAreaM2: null },
  "P3":  { description: "Park — City Wide",                       maxHeightM: 6,   maxStoreys: 1,  maxFAR: 0.1, maxUnits: null, minLotAreaM2: null },
  "U3":  { description: "Utility — Parking",                      maxHeightM: 6,   maxStoreys: 1,  maxFAR: 0.0, maxUnits: null, minLotAreaM2: null },
  "U1":  { description: "Utility — Public Works",                 maxHeightM: 15,  maxStoreys: 4,  maxFAR: 1.0, maxUnits: null, minLotAreaM2: null },
};
